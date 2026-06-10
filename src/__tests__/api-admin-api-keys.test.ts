/**
 * Phase 9 tests — /api/admin/api-keys route.
 * Intent (security-critical): GET must never return a key value — only
 * masked previews. store/rotate validate against the provider allowlist and
 * key-length bounds, encrypt before storing, and leave both an ApiKeyAudit
 * row (via the manager) and an AdminAction row.
 */

const mockVerifyAdmin = jest.fn();
jest.mock('@/lib/admin/auth', () => ({
  verifyAdmin: (...a: unknown[]) => mockVerifyAdmin(...a),
  forbiddenResponse: () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
}));

jest.mock('@/lib/api', () => ({
  apiSuccess: (data: unknown, status = 200) => new Response(JSON.stringify(data), { status }),
  apiError: (msg: string, status = 400) => new Response(JSON.stringify({ error: msg }), { status }),
}));

// Deterministic reversible "encryption" so we can assert ciphertext != plaintext
jest.mock('@/lib/encryption', () => ({
  encrypt: (v: string) => `enc(${v})`,
  decrypt: (v: string) => v.replace(/^enc\(/, '').replace(/\)$/, ''),
}));

const mockKeyFindMany = jest.fn();
const mockKeyFindFirst = jest.fn();
const mockKeyUpsert = jest.fn();
const mockKeyCreate = jest.fn();
const mockKeyUpdate = jest.fn();
const mockAuditCreate = jest.fn();
const mockActionCreate = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    apiKey: {
      findMany: (...a: unknown[]) => mockKeyFindMany(...a),
      findFirst: (...a: unknown[]) => mockKeyFindFirst(...a),
      upsert: (...a: unknown[]) => mockKeyUpsert(...a),
      create: (...a: unknown[]) => mockKeyCreate(...a),
      update: (...a: unknown[]) => mockKeyUpdate(...a),
    },
    apiKeyAudit: {
      create: (...a: unknown[]) => mockAuditCreate(...a),
      findMany: jest.fn().mockResolvedValue([]),
    },
    adminAction: { create: (...a: unknown[]) => mockActionCreate(...a) },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/admin/api-keys/route';

const ADMIN_SESSION = { user: { id: 'admin-1', email: 'admin@test.com' } };
const SECRET = 'sk-test-key-value-1234567890';

function postReq(action: string, body: unknown): NextRequest {
  const url = new URL(`http://localhost:3000/api/admin/api-keys?action=${action}`);
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function getReq(provider?: string): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/api-keys');
  if (provider) url.searchParams.set('provider', provider);
  return new NextRequest(url);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockVerifyAdmin.mockResolvedValue(ADMIN_SESSION);
  mockKeyUpsert.mockResolvedValue({ id: 'key-1' });
  mockKeyCreate.mockResolvedValue({ id: 'key-2' });
  mockKeyUpdate.mockResolvedValue({ id: 'key-1' });
  mockKeyFindFirst.mockResolvedValue(null);
  mockAuditCreate.mockResolvedValue({ id: 'audit-1' });
  mockActionCreate.mockResolvedValue({ id: 'act-1' });
  mockKeyFindMany.mockResolvedValue([
    {
      id: 'key-1',
      provider: 'gemini',
      status: 'active',
      keyEncrypted: `enc(${SECRET})`,
      createdAt: new Date('2026-06-01'),
      rotatedAt: null,
      lastUsedAt: null,
    },
  ]);
});

describe('GET — never returns key values', () => {
  it('list returns masked preview (last 4 chars) but never the full key', async () => {
    const res = await GET(getReq());
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain(`enc(${SECRET})`);

    const json = JSON.parse(text);
    expect(json.keys).toHaveLength(1);
    expect(json.keys[0].maskedKey).toBe(SECRET.slice(-4));
    expect(json.keys[0]).not.toHaveProperty('keyEncrypted');
  });

  it('provider existence check returns no key content', async () => {
    mockKeyFindFirst.mockResolvedValue({
      id: 'key-1',
      provider: 'gemini',
      keyEncrypted: `enc(${SECRET})`,
    });
    mockKeyUpdate.mockResolvedValue({});
    const res = await GET(getReq('gemini'));
    const text = await res.text();
    expect(text).not.toContain(SECRET);
    expect(JSON.parse(text).exists).toBe(true);
  });

  it('returns 403 for non-admins', async () => {
    mockVerifyAdmin.mockResolvedValue(null);
    const res = await GET(getReq());
    expect(res.status).toBe(403);
  });
});

describe('POST ?action=store', () => {
  it('encrypts before storing and logs AdminAction + ApiKeyAudit', async () => {
    const res = await POST(
      postReq('store', { provider: 'gemini', keyName: 'gemini', keyValue: SECRET }),
    );
    expect(res.status).toBe(200);

    const upsertArg = mockKeyUpsert.mock.calls[0][0];
    expect(upsertArg.create.keyEncrypted).toBe(`enc(${SECRET})`);
    expect(upsertArg.create.keyEncrypted).not.toBe(SECRET);

    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'created' }) }),
    );
    expect(mockActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: 'api_key_add',
          entityType: 'api_key',
          adminId: 'admin-1',
        }),
      }),
    );
  });

  it('rejects providers outside the allowlist', async () => {
    const res = await POST(
      postReq('store', { provider: 'evil-corp', keyName: 'x', keyValue: SECRET }),
    );
    expect(res.status).toBe(400);
    expect(mockKeyUpsert).not.toHaveBeenCalled();
  });

  it('rejects keys shorter than 10 chars', async () => {
    const res = await POST(
      postReq('store', { provider: 'gemini', keyName: 'x', keyValue: 'short' }),
    );
    expect(res.status).toBe(400);
    expect(mockKeyUpsert).not.toHaveBeenCalled();
  });
});

describe('POST ?action=rotate', () => {
  it('marks the old key rotated, creates a new encrypted key, and logs both trails', async () => {
    mockKeyFindFirst.mockResolvedValue({ id: 'old-key', provider: 'linkedin', status: 'active' });
    const res = await POST(postReq('rotate', { provider: 'linkedin', newKeyValue: SECRET }));
    expect(res.status).toBe(200);

    expect(mockKeyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'old-key' },
        data: expect.objectContaining({ status: 'rotated' }),
      }),
    );
    expect(mockKeyCreate.mock.calls[0][0].data.keyEncrypted).toBe(`enc(${SECRET})`);
    expect(mockActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: 'api_key_rotate' }),
      }),
    );
  });

  it('returns 403 for non-admins', async () => {
    mockVerifyAdmin.mockResolvedValue(null);
    const res = await POST(postReq('rotate', { provider: 'gemini', newKeyValue: SECRET }));
    expect(res.status).toBe(403);
    expect(mockKeyCreate).not.toHaveBeenCalled();
  });
});

describe('POST ?action=import-env', () => {
  const savedResend = process.env.RESEND_API_KEY;
  const savedLinkedin = process.env.LINKEDIN_ACCESS_TOKEN;

  afterEach(() => {
    if (savedResend === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = savedResend;
    if (savedLinkedin === undefined) delete process.env.LINKEDIN_ACCESS_TOKEN;
    else process.env.LINKEDIN_ACCESS_TOKEN = savedLinkedin;
  });

  it('imports env keys encrypted, logs AdminAction, and never returns values', async () => {
    process.env.RESEND_API_KEY = SECRET;
    delete process.env.LINKEDIN_ACCESS_TOKEN;

    const req = new NextRequest('http://localhost:3000/api/admin/api-keys?action=import-env', {
      method: 'POST',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(text).not.toContain(SECRET);
    const json = JSON.parse(text);
    expect(json.imported).toContain('resend');
    expect(json.skipped).toContain('linkedin');

    // Stored encrypted via the manager
    expect(mockKeyUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ provider: 'resend', keyEncrypted: `enc(${SECRET})` }),
      }),
    );

    expect(mockActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: 'api_key_import' }),
      }),
    );
  });

  it('returns 403 for non-admins', async () => {
    mockVerifyAdmin.mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/admin/api-keys?action=import-env', {
      method: 'POST',
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(mockKeyUpsert).not.toHaveBeenCalled();
  });
});

describe('POST ?action=revoke', () => {
  it('revokes by id and logs the admin action', async () => {
    const res = await POST(postReq('revoke', { keyId: 'key-1', reason: 'compromised' }));
    expect(res.status).toBe(200);
    expect(mockKeyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'key-1' },
        data: expect.objectContaining({ status: 'revoked' }),
      }),
    );
    expect(mockActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: 'api_key_revoke' }),
      }),
    );
  });
});
