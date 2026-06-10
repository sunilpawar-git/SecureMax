/**
 * Phase 11B — Turnstile bot check at questionnaire start.
 * Intent: a session must NOT be created (AI service never called) unless
 * Turnstile verification passes. Invalid/missing tokens return 403.
 */

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/ai-service', () => ({
  aiServiceFetch: jest.fn(),
  AIServiceError: class AIServiceError extends Error {},
}));
jest.mock('@/lib/prisma', () => ({
  prisma: { auditSession: { count: jest.fn().mockResolvedValue(0) } },
}));
jest.mock('@/lib/security/turnstile', () => ({ verifyTurnstile: jest.fn() }));

import { auth } from '@/lib/auth';
import { aiServiceFetch } from '@/lib/ai-service';
import { verifyTurnstile } from '@/lib/security/turnstile';
import type { NextRequest } from 'next/server';

const mockAuth = auth as unknown as jest.Mock;
const mockAiFetch = aiServiceFetch as unknown as jest.Mock;
const mockVerify = verifyTurnstile as unknown as jest.Mock;

function makeStartReq(body: unknown): NextRequest {
  return {
    nextUrl: { searchParams: new URLSearchParams('action=start') },
    json: async () => body,
  } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({
    user: {
      id: 'user-1',
      email: 'u@test.com',
      role: 'user',
      track: 'hni',
      consentAt: '2026-01-01',
    },
  });
  mockAiFetch.mockResolvedValue({ session_id: 's1' });
});

describe('POST /api/questionnaire?action=start — Turnstile gate', () => {
  it('returns 403 and never creates a session when verification fails', async () => {
    mockVerify.mockResolvedValue(false);
    const { POST } = await import('@/app/api/questionnaire/route');

    const res = await POST(makeStartReq({ track: 'hni', captcha_token: 'bad-token' }));
    expect(res.status).toBe(403);
    expect(mockAiFetch).not.toHaveBeenCalled();
  });

  it('returns 403 when no token is supplied and verification fails closed', async () => {
    mockVerify.mockResolvedValue(false);
    const { POST } = await import('@/app/api/questionnaire/route');

    const res = await POST(makeStartReq({ track: 'hni' }));
    expect(res.status).toBe(403);
    expect(mockVerify).toHaveBeenCalledWith(undefined);
    expect(mockAiFetch).not.toHaveBeenCalled();
  });

  it('starts the session when verification passes, forwarding the token to verify', async () => {
    mockVerify.mockResolvedValue(true);
    const { POST } = await import('@/app/api/questionnaire/route');

    const res = await POST(makeStartReq({ track: 'hni', captcha_token: 'good-token' }));
    expect(res.status).toBe(200);
    expect(mockVerify).toHaveBeenCalledWith('good-token');
    expect(mockAiFetch).toHaveBeenCalledWith(
      '/questionnaire/start',
      expect.objectContaining({ body: { user_id: 'user-1', track: 'hni' } }),
    );
  });

  it('verifies the token BEFORE any other start work (no session-count query on failure)', async () => {
    mockVerify.mockResolvedValue(false);
    const { prisma } = jest.requireMock('@/lib/prisma') as {
      prisma: { auditSession: { count: jest.Mock } };
    };
    const { POST } = await import('@/app/api/questionnaire/route');

    await POST(makeStartReq({ track: 'hni', captcha_token: 'bad' }));
    expect(prisma.auditSession.count).not.toHaveBeenCalled();
  });
});
