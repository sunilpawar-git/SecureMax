/**
 * Phase 3 — Enterprise proposal phone dedup.
 * Intent: the proposal form must not re-ask for a phone number already
 * collected at onboarding. The server is the source of truth for
 * `preferredContact` — it reads `User.phone`, never a client-submitted value.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import fs from 'fs';
import path from 'path';

// ─── Schema no longer accepts contactPhone ────────────────────────────────────

describe('EnterpriseProposalSchema drops contactPhone', () => {
  it('parses without contactPhone and the result has no contactPhone key', () => {
    const { EnterpriseProposalSchema } = require('@/lib/payment/schemas');
    const result = EnterpriseProposalSchema.safeParse({
      companyName: 'Acme Corp',
      contactName: 'Jane Doe',
      contactEmail: 'jane@acme.com',
      facilityCount: 3,
      reportId: 'sess-1',
    });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('contactPhone');
  });

  it('strips a client-supplied contactPhone rather than persisting it', () => {
    const { EnterpriseProposalSchema } = require('@/lib/payment/schemas');
    const result = EnterpriseProposalSchema.safeParse({
      companyName: 'Acme Corp',
      contactName: 'Jane Doe',
      contactEmail: 'jane@acme.com',
      contactPhone: '9999999999',
      facilityCount: 3,
      reportId: 'sess-1',
    });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('contactPhone');
  });
});

// ─── Proposal page no longer renders a phone field ────────────────────────────

describe('Enterprise proposal page drops the phone field', () => {
  const content = fs.readFileSync(
    path.join(
      process.cwd(),
      'src',
      'app',
      '(app)',
      'enterprise',
      'proposal',
      'page.tsx',
    ),
    'utf-8',
  );

  it('does not render a contactPhone field', () => {
    expect(content).not.toContain('contactPhone');
  });

  it('does not include phone in the submit payload', () => {
    expect(content).not.toMatch(/form\.contactPhone/);
  });
});

// ─── Route requires auth and reads User.phone, ignoring client input ─────────

const mockRequireAuth = jest.fn();
const mockUserFindUnique = jest.fn();
const mockLeadCreate = jest.fn();

jest.mock('@/lib/api', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  apiSuccess: (data: unknown, status = 200) => new Response(JSON.stringify(data), { status }),
  apiError: (msg: string, status = 400) => new Response(JSON.stringify({ error: msg }), { status }),
  apiValidationError: (errors: unknown) =>
    new Response(JSON.stringify({ errors }), { status: 422 }),
  parseBody: async (req: Request, schema: { safeParse: (v: unknown) => any }) => {
    const result = schema.safeParse(await req.json());
    return result.success
      ? { success: true, data: result.data }
      : { success: false, errors: result.error.issues };
  },
}));

jest.mock('@/lib/payment/razorpay', () => ({
  createOrder: jest.fn(),
  verifySignature: jest.fn(),
  getKeyId: () => 'rzp_test_key',
}));

jest.mock('@/lib/payment/payment-service', () => ({
  persistPaymentUnlock: jest.fn(),
  isWebhookProcessed: jest.fn(),
  logPaymentVerification: jest.fn(),
}));

jest.mock('@/lib/admin/webhook-service', () => ({
  logWebhookSuccess: jest.fn(),
  logWebhookFailure: jest.fn(),
}));

jest.mock('@/lib/admin/alert-service', () => ({
  sendNewLeadAlert: jest.fn(),
}));

jest.mock('@/lib/security/turnstile', () => ({
  verifyTurnstile: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    enterpriseLead: {
      create: (...args: unknown[]) => mockLeadCreate(...args),
    },
  },
}));

function makeRequest(url: string, body: unknown): any {
  const req = new Request(url, { method: 'POST', body: JSON.stringify(body) }) as any;
  req.nextUrl = new URL(url);
  return req;
}

async function callEnterpriseProposal(body: Record<string, unknown>) {
  const { POST } = await import('@/app/api/payment/route');
  return POST(
    makeRequest('http://localhost/api/payment?action=enterprise-proposal', {
      companyName: 'Acme Corp',
      contactName: 'Jane Doe',
      contactEmail: 'jane@acme.com',
      facilityCount: 3,
      reportId: 'sess-1',
      ...body,
    }),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/payment?action=enterprise-proposal — server-side phone lookup', () => {
  it('returns 401 without an authenticated session', async () => {
    mockRequireAuth.mockResolvedValue(null);

    const res = await callEnterpriseProposal({});

    expect(res.status).toBe(401);
    expect(mockLeadCreate).not.toHaveBeenCalled();
  });

  it('uses the authenticated user.phone as preferredContact', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserFindUnique.mockResolvedValue({ phone: '919999999999' });
    mockLeadCreate.mockResolvedValue({ id: 'lead-1', company: 'Acme Corp', name: 'Jane Doe', email: 'jane@acme.com' });

    const res = await callEnterpriseProposal({});

    expect(res.status).toBe(201);
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { phone: true },
    });
    expect(mockLeadCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ preferredContact: '919999999999' }),
    });
  });

  it('ignores a forged client-supplied contactPhone and uses User.phone instead', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserFindUnique.mockResolvedValue({ phone: '919999999999' });
    mockLeadCreate.mockResolvedValue({ id: 'lead-1', company: 'Acme Corp', name: 'Jane Doe', email: 'jane@acme.com' });

    const res = await callEnterpriseProposal({ contactPhone: '000000000-forged' });

    expect(res.status).toBe(201);
    expect(mockLeadCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ preferredContact: '919999999999' }),
    });
  });

  it('falls back to null preferredContact when the user has no phone on file', async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserFindUnique.mockResolvedValue({ phone: null });
    mockLeadCreate.mockResolvedValue({ id: 'lead-1', company: 'Acme Corp', name: 'Jane Doe', email: 'jane@acme.com' });

    const res = await callEnterpriseProposal({});

    expect(res.status).toBe(201);
    expect(mockLeadCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ preferredContact: null }),
    });
  });
});
