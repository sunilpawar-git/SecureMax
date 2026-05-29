/**
 * Phase 2 — CAPTCHA enforcement on the enterprise-proposal endpoint (#12).
 * TDD: written BEFORE wiring verifyTurnstile into the payment route.
 *
 * Rule 9: a failed CAPTCHA must block lead creation. Removing the guard fails
 * the "does not create a lead" assertion.
 */

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/security/turnstile', () => ({ verifyTurnstile: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    enterpriseLead: { create: jest.fn() },
    auditSession: { findFirst: jest.fn(), update: jest.fn() },
  },
}));

import { auth } from '@/lib/auth';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { prisma } from '@/lib/prisma';
import type { NextRequest } from 'next/server';

const mockAuth = auth as unknown as jest.Mock;
const mockVerify = verifyTurnstile as unknown as jest.Mock;
const mockCreate = prisma.enterpriseLead.create as unknown as jest.Mock;

function makeReq(body: unknown): NextRequest {
  return {
    nextUrl: { searchParams: new URLSearchParams('action=enterprise-proposal') },
    json: async () => body,
  } as unknown as NextRequest;
}

const VALID_BODY = {
  companyName: 'Acme Corp',
  contactName: 'Alice',
  contactEmail: 'alice@acme.com',
  facilityCount: 2,
  reportId: 'sess_abc123',
  captchaToken: 'tok',
};

describe('POST /api/payment?action=enterprise-proposal — CAPTCHA', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: 'u1',
        email: 'u@test.com',
        role: 'user',
        track: 'enterprise',
        consentAt: '2026-01-01',
      },
    });
  });

  it('blocks lead creation with 400 when CAPTCHA verification fails', async () => {
    mockVerify.mockResolvedValue(false);
    const { POST } = await import('@/app/api/payment/route');
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates the lead when CAPTCHA verification passes', async () => {
    mockVerify.mockResolvedValue(true);
    mockCreate.mockResolvedValue({ id: 'lead-1' });
    const { POST } = await import('@/app/api/payment/route');
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
