/**
 * Remediation R1 — server-side payment skip enforcement.
 * Intent: a session already unlocked (coupon redemption, admin mark-paid)
 * must NEVER reach Razorpay order creation, regardless of what the UI shows.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockRequireAuth = jest.fn();
const mockSessionFindFirst = jest.fn();
const mockSessionUpdate = jest.fn();
const mockCreateOrder = jest.fn();

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
  createOrder: (...args: unknown[]) => mockCreateOrder(...args),
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
  verifyTurnstile: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    auditSession: {
      findFirst: (...args: unknown[]) => mockSessionFindFirst(...args),
      update: (...args: unknown[]) => mockSessionUpdate(...args),
    },
  },
}));

import { PAYMENT_ERR } from '@/config/strings';

function makeRequest(url: string, body: unknown): any {
  const req = new Request(url, { method: 'POST', body: JSON.stringify(body) }) as any;
  req.nextUrl = new URL(url);
  return req;
}

async function callCreateOrder(reportId: string) {
  const { POST } = await import('@/app/api/payment/route');
  return POST(
    makeRequest('http://localhost/api/payment?action=create-order', {
      report_id: reportId,
    }),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } });
});

describe('POST /api/payment?action=create-order — paid-session guard', () => {
  it('returns 409 and never calls Razorpay when the session is already paid', async () => {
    mockSessionFindFirst.mockResolvedValue({ id: 'sess-1', userId: 'user-1', paid: true });

    const res = await callCreateOrder('sess-1');

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(PAYMENT_ERR.ALREADY_UNLOCKED);
    expect(mockCreateOrder).not.toHaveBeenCalled();
    expect(mockSessionUpdate).not.toHaveBeenCalled();
  });

  it('creates a Razorpay order for an unpaid owned session', async () => {
    mockSessionFindFirst.mockResolvedValue({ id: 'sess-1', userId: 'user-1', paid: false });
    mockCreateOrder.mockResolvedValue({ id: 'order_1', amount: 499900, currency: 'INR' });
    mockSessionUpdate.mockResolvedValue({});

    const res = await callCreateOrder('sess-1');

    expect(res.status).toBe(200);
    expect(mockCreateOrder).toHaveBeenCalled();
    expect(mockSessionUpdate).toHaveBeenCalledWith({
      where: { id: 'sess-1' },
      data: { razorpayOrderId: 'order_1' },
    });
  });

  it('returns 404 for a session the user does not own', async () => {
    mockSessionFindFirst.mockResolvedValue(null);

    const res = await callCreateOrder('sess-other');

    expect(res.status).toBe(404);
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });
});
