/**
 * Phase 5 tests — first-download bookkeeping on GET /api/report?action=full
 * and the admin login audit trail.
 *
 * Intent (Rule 9): the first PDF download must stamp downloadedAt, schedule
 * the follow-up, and alert the admin — exactly once. Admin sign-ins must
 * leave an immutable AdminAction row without ever blocking the login.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockRequireAuth = jest.fn();
jest.mock('@/lib/api', () => ({
  requireAuth: () => mockRequireAuth(),
  unauthorizedResponse: () => new Response(null, { status: 401 }),
  apiSuccess: (data: unknown) => new Response(JSON.stringify(data), { status: 200 }),
  apiError: (msg: string, code = 400) =>
    new Response(JSON.stringify({ error: msg }), { status: code }),
  validateCuid: (id: string) => /^[a-z0-9]{20,}$/i.test(id),
}));

const mockUpdateMany = jest.fn();
const mockUserFindUnique = jest.fn();
const mockAdminActionCreate = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    auditSession: { updateMany: (...a: unknown[]) => mockUpdateMany(...a) },
    user: { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) },
    adminAction: { create: (...a: unknown[]) => mockAdminActionCreate(...a) },
  },
}));

const mockSendReportDownloadAlert = jest.fn();
jest.mock('@/lib/admin/alert-service', () => ({
  sendReportDownloadAlert: (...a: unknown[]) => mockSendReportDownloadAlert(...a),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock('@/lib/ai-service', () => ({
  aiServiceFetch: jest.fn(),
  AIServiceError: class AIServiceError extends Error {
    statusCode = 500;
  },
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/report/route';
import { logAdminLogin } from '@/lib/auth/login-audit';
import { FOLLOW_UP_DAYS } from '@/config/admin-strings';

const VALID_CUID = 'clxreport0000000000000001';

function fullDownloadRequest(): NextRequest {
  return new NextRequest(`http://localhost:3000/api/report?action=full&report_id=${VALID_CUID}`);
}

const realFetch = global.fetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } });
  mockUpdateMany.mockResolvedValue({ count: 1 });
  mockUserFindUnique.mockResolvedValue({ email: 'hni@example.com', name: 'Rich Client' });
  mockAdminActionCreate.mockResolvedValue({ id: 'act-1' });
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(8),
  }) as any;
});

afterAll(() => {
  global.fetch = realFetch;
});

describe('GET /api/report?action=full — first-download bookkeeping', () => {
  it('stamps downloadedAt + follow-up date and alerts the admin on first download', async () => {
    const res = await GET(fullDownloadRequest());
    expect(res.status).toBe(200);

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: VALID_CUID, userId: 'user-1', downloadedAt: null },
      data: expect.objectContaining({
        downloadedAt: expect.any(Date),
        postDownloadFollowupAt: expect.any(Date),
      }),
    });

    const { downloadedAt, postDownloadFollowupAt } = mockUpdateMany.mock.calls[0][0].data;
    const gapDays = (postDownloadFollowupAt.getTime() - downloadedAt.getTime()) / 86_400_000;
    expect(gapDays).toBeCloseTo(FOLLOW_UP_DAYS);

    expect(mockSendReportDownloadAlert).toHaveBeenCalledWith({
      sessionId: VALID_CUID,
      userEmail: 'hni@example.com',
      userName: 'Rich Client',
    });
  });

  it('does not re-alert on subsequent downloads (downloadedAt already set)', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });
    const res = await GET(fullDownloadRequest());
    expect(res.status).toBe(200);
    expect(mockSendReportDownloadAlert).not.toHaveBeenCalled();
  });

  it('still streams the PDF when bookkeeping fails', async () => {
    mockUpdateMany.mockRejectedValue(new Error('db down'));
    const res = await GET(fullDownloadRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
  });

  it('does no bookkeeping when the upstream PDF fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
    const res = await GET(fullDownloadRequest());
    expect(res.status).toBe(404);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });
});

describe('logAdminLogin — admin sign-in audit', () => {
  it('writes an AdminAction row with action type admin_login', async () => {
    await logAdminLogin('admin-1', 'google');
    expect(mockAdminActionCreate).toHaveBeenCalledWith({
      data: {
        adminId: 'admin-1',
        actionType: 'admin_login',
        entityType: 'user',
        entityId: 'admin-1',
        metadata: { provider: 'google' },
      },
    });
  });

  it('never throws when the audit insert fails (login must not be blocked)', async () => {
    mockAdminActionCreate.mockRejectedValue(new Error('db down'));
    await expect(logAdminLogin('admin-1', 'google')).resolves.toBeUndefined();
  });
});

describe('auth wiring — index.ts gates the audit on admin role', () => {
  // next-auth is ESM-only and cannot be imported under Jest, so verify the
  // wiring at source level: the jwt callback must call logAdminLogin only
  // for USER_ROLE.ADMIN users.
  it('jwt callback calls logAdminLogin for admins', () => {
    const fs = jest.requireActual('fs') as typeof import('fs');
    const path = jest.requireActual('path') as typeof import('path');
    const src = fs.readFileSync(path.join(process.cwd(), 'src/lib/auth/index.ts'), 'utf8');
    expect(src).toContain("import { logAdminLogin } from './login-audit'");
    expect(src).toMatch(
      /if \(dbUser\.role === USER_ROLE\.ADMIN\) \{\s*await logAdminLogin\(dbUser\.id, account\.provider\);/,
    );
  });
});
