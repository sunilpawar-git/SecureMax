/**
 * Phase 8 tests — POST /api/admin/newsletter/[id]/publish.
 * Intent: per-platform publish writes a NewsletterPost row for EVERY attempt
 * (Rule 15 — success AND failure), never double-posts an already-posted
 * platform, flips the newsletter to published on first success, and logs
 * the admin action per platform.
 */

const mockVerifyAdmin = jest.fn();
jest.mock('@/lib/admin/auth', () => ({
  verifyAdmin: (...a: unknown[]) => mockVerifyAdmin(...a),
  forbiddenResponse: () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
}));

const mockPublish = jest.fn();
const mockIsConfigured = jest.fn();
jest.mock('@/lib/social', () => ({
  getPublisher: (platform: string) =>
    platform === 'linkedin'
      ? { platform: 'linkedin', isConfigured: mockIsConfigured, publish: mockPublish }
      : null,
}));

const mockNlFindUnique = jest.fn();
const mockNlUpdate = jest.fn();
const mockPostFindUnique = jest.fn();
const mockPostUpsert = jest.fn();
const mockActionCreate = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    newsletter: {
      findUnique: (...a: unknown[]) => mockNlFindUnique(...a),
      update: (...a: unknown[]) => mockNlUpdate(...a),
    },
    newsletterPost: {
      findUnique: (...a: unknown[]) => mockPostFindUnique(...a),
      upsert: (...a: unknown[]) => mockPostUpsert(...a),
    },
    adminAction: { create: (...a: unknown[]) => mockActionCreate(...a) },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/newsletter/[id]/publish/route';

const ADMIN_SESSION = { user: { id: 'admin-1' } };

function publishReq(body: unknown, id = 'nl-1') {
  const req = new NextRequest(`http://localhost:3000/api/admin/newsletter/${id}/publish`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
  return POST(req, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockVerifyAdmin.mockResolvedValue(ADMIN_SESSION);
  mockIsConfigured.mockResolvedValue(true);
  mockPublish.mockResolvedValue({ success: true, externalId: 'urn:li:share:1' });
  mockNlFindUnique.mockResolvedValue({
    id: 'nl-1',
    title: 'Digest',
    status: 'draft',
    imagePng: Buffer.from('png'),
  });
  mockNlUpdate.mockResolvedValue({ id: 'nl-1' });
  mockPostFindUnique.mockResolvedValue(null);
  mockPostUpsert.mockResolvedValue({ id: 'np-1' });
  mockActionCreate.mockResolvedValue({ id: 'act-1' });
});

describe('POST /api/admin/newsletter/[id]/publish', () => {
  it('publishes to the platform, records the posted row, and logs the action', async () => {
    const res = await publishReq({ platforms: ['linkedin'], captions: { linkedin: 'Custom!' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.linkedin.success).toBe(true);

    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({ caption: 'Custom!', imagePng: expect.any(Buffer) }),
    );
    expect(mockPostUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          platform: 'linkedin',
          status: 'posted',
          externalId: 'urn:li:share:1',
          caption: 'Custom!',
        }),
      }),
    );
    expect(mockNlUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'published' }) }),
    );
    expect(mockActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: 'newsletter_published' }),
      }),
    );
  });

  it('records a FAILED row when the platform call fails (Rule 15: attempts are logged)', async () => {
    mockPublish.mockResolvedValue({ success: false, error: 'LinkedIn API error (401)' });
    const res = await publishReq({ platforms: ['linkedin'] });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.linkedin.success).toBe(false);

    expect(mockPostUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: 'failed', errorMsg: 'LinkedIn API error (401)' }),
      }),
    );
    // No success → the newsletter must NOT flip to published
    expect(mockNlUpdate).not.toHaveBeenCalled();
  });

  it('never double-posts a platform that is already posted', async () => {
    mockPostFindUnique.mockResolvedValue({ id: 'np-1', status: 'posted' });
    const res = await publishReq({ platforms: ['linkedin'] });
    const body = await res.json();
    expect(body.results.linkedin.success).toBe(false);
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('reports unconfigured platforms without attempting them', async () => {
    mockIsConfigured.mockResolvedValue(false);
    const res = await publishReq({ platforms: ['linkedin'] });
    const body = await res.json();
    expect(body.results.linkedin.success).toBe(false);
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('404s when the newsletter is missing or has no image', async () => {
    mockNlFindUnique.mockResolvedValue(null);
    const res = await publishReq({ platforms: ['linkedin'] });
    expect(res.status).toBe(404);
  });

  it('400s on platforms outside the allowlist', async () => {
    const res = await publishReq({ platforms: ['myspace'] });
    expect(res.status).toBe(400);
  });

  it('returns 403 for non-admins', async () => {
    mockVerifyAdmin.mockResolvedValue(null);
    const res = await publishReq({ platforms: ['linkedin'] });
    expect(res.status).toBe(403);
    expect(mockPublish).not.toHaveBeenCalled();
  });
});
