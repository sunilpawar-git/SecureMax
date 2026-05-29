/**
 * Integration tests for /api/admin/users route handler.
 * Mocks verifyAdmin and getUsers to test auth, validation, audit trail, and response shape.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/users/route';
import { USERS_PAGE } from '@/config/admin-strings';
import type { UserEntry } from '@/lib/admin/users-service';

const mockVerifyAdmin = jest.fn();
const mockGetUsers = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('@/lib/prisma', () => ({ prisma: {} }));

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
  handlers: {},
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('@/lib/admin/auth', () => ({
  verifyAdmin: () => mockVerifyAdmin(),
  forbiddenResponse: () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
}));

jest.mock('@/lib/admin/users-service', () => ({
  getUsers: (...a: unknown[]) => mockGetUsers(...a),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: (...a: unknown[]) => mockLoggerInfo(...a),
    error: (...a: unknown[]) => mockLoggerError(...a),
  },
}));

const ADMIN_SESSION = { user: { id: 'admin-1', email: 'admin@test.com', role: 'admin' } };

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/admin/users');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

const SAMPLE_USER: UserEntry = {
  id: 'user-1',
  email: 'alice@test.com',
  name: 'Alice',
  image: null,
  role: 'user',
  track: 'hni',
  joinedAt: '2026-01-01T00:00:00.000Z',
  sessionCount: 3,
  paidSessionCount: 1,
  lastActiveAt: '2026-05-01T00:00:00.000Z',
};

const SAMPLE_RESULT = { users: [SAMPLE_USER], total: 1, page: 1, limit: 50 };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/admin/users — authentication', () => {
  it('returns 403 when caller is not admin', async () => {
    mockVerifyAdmin.mockResolvedValue(null);

    const res = await GET(makeRequest());

    expect(res.status).toBe(403);
  });

  it('proceeds when caller is admin', async () => {
    mockVerifyAdmin.mockResolvedValue(ADMIN_SESSION);
    mockGetUsers.mockResolvedValue(SAMPLE_RESULT);

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
  });
});

describe('GET /api/admin/users — audit trail', () => {
  it('logs admin ID after successful access (no PII)', async () => {
    mockVerifyAdmin.mockResolvedValue(ADMIN_SESSION);
    mockGetUsers.mockResolvedValue(SAMPLE_RESULT);

    await GET(makeRequest({ track: 'hni' }));

    expect(mockLoggerInfo).toHaveBeenCalledWith(
      'Admin user list accessed',
      'admin-users',
      expect.objectContaining({ adminId: 'admin-1' }),
    );
  });

  it('does not log admin email in audit entry', async () => {
    mockVerifyAdmin.mockResolvedValue(ADMIN_SESSION);
    mockGetUsers.mockResolvedValue(SAMPLE_RESULT);

    await GET(makeRequest());

    const logCall = mockLoggerInfo.mock.calls[0];
    const logData = logCall?.[2] as Record<string, unknown>;
    expect(logData).not.toHaveProperty('adminEmail');
  });

  it('does not log audit on failed query', async () => {
    mockVerifyAdmin.mockResolvedValue(ADMIN_SESSION);
    mockGetUsers.mockRejectedValue(new Error('DB down'));

    await GET(makeRequest());

    expect(mockLoggerInfo).not.toHaveBeenCalled();
    expect(mockLoggerError).toHaveBeenCalled();
  });
});

describe('GET /api/admin/users — response shape', () => {
  it('returns users and total in body', async () => {
    mockVerifyAdmin.mockResolvedValue(ADMIN_SESSION);
    mockGetUsers.mockResolvedValue(SAMPLE_RESULT);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.users).toHaveLength(1);
    expect(body.users[0].email).toBe('alice@test.com');
    expect(body.total).toBe(1);
  });

  it('passes track filter to getUsers', async () => {
    mockVerifyAdmin.mockResolvedValue(ADMIN_SESSION);
    mockGetUsers.mockResolvedValue({ users: [], total: 0, page: 1, limit: 50 });

    await GET(makeRequest({ track: 'enterprise' }));

    expect(mockGetUsers).toHaveBeenCalledWith(expect.objectContaining({ track: 'enterprise' }));
  });

  it('passes search filter to getUsers', async () => {
    mockVerifyAdmin.mockResolvedValue(ADMIN_SESSION);
    mockGetUsers.mockResolvedValue({ users: [], total: 0, page: 1, limit: 50 });

    await GET(makeRequest({ search: 'alice' }));

    expect(mockGetUsers).toHaveBeenCalledWith(expect.objectContaining({ search: 'alice' }));
  });

  it('passes page and limit to getUsers', async () => {
    mockVerifyAdmin.mockResolvedValue(ADMIN_SESSION);
    mockGetUsers.mockResolvedValue({ users: [], total: 0, page: 2, limit: 10 });

    await GET(makeRequest({ page: '2', limit: '10' }));

    expect(mockGetUsers).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 10 }));
  });
});

describe('GET /api/admin/users — validation', () => {
  it('returns 400 for invalid track value', async () => {
    mockVerifyAdmin.mockResolvedValue(ADMIN_SESSION);

    const res = await GET(makeRequest({ track: 'unknown' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe(USERS_PAGE.ERR_INVALID_FILTER);
  });

  it('returns 400 for non-numeric page value', async () => {
    mockVerifyAdmin.mockResolvedValue(ADMIN_SESSION);

    const res = await GET(makeRequest({ page: 'abc' }));

    expect(res.status).toBe(400);
  });

  it('returns 400 when limit exceeds 100', async () => {
    mockVerifyAdmin.mockResolvedValue(ADMIN_SESSION);

    const res = await GET(makeRequest({ limit: '101' }));

    expect(res.status).toBe(400);
  });

  it('returns 400 when search exceeds 200 characters', async () => {
    mockVerifyAdmin.mockResolvedValue(ADMIN_SESSION);

    const res = await GET(makeRequest({ search: 'x'.repeat(201) }));

    expect(res.status).toBe(400);
  });

  it('defaults page to 1 and limit to 50 when not provided', async () => {
    mockVerifyAdmin.mockResolvedValue(ADMIN_SESSION);
    mockGetUsers.mockResolvedValue(SAMPLE_RESULT);

    await GET(makeRequest());

    expect(mockGetUsers).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 50 }));
  });
});

describe('GET /api/admin/users — error handling', () => {
  it('returns 500 when getUsers throws', async () => {
    mockVerifyAdmin.mockResolvedValue(ADMIN_SESSION);
    mockGetUsers.mockRejectedValue(new Error('DB connection lost'));

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe(USERS_PAGE.ERR_LOAD_FAILED);
  });
});
