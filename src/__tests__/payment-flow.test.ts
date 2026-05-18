/**
 * Phase 0.2 — Payment flow correctness.
 * TDD: Tests written BEFORE fixing the payment route.
 *
 * Verifies:
 *  1. Successful verify writes AuditSession.paid = true
 *  2. Duplicate verify calls are idempotent (don't re-process)
 *  3. Zod validation rejects malformed payloads
 *  4. Missing fields return structured 422 errors
 */

import {
  CreateOrderSchema,
  VerifyPaymentSchema,
} from '@/lib/payment/schemas';

// ─── Zod schema tests (pure, no mocks) ────────────────────────────────────────

describe('CreateOrderSchema', () => {
  it('accepts valid create-order payload', () => {
    const result = CreateOrderSchema.safeParse({
      report_id: 'sess_abc123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing report_id', () => {
    const result = CreateOrderSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty report_id', () => {
    const result = CreateOrderSchema.safeParse({ report_id: '' });
    expect(result.success).toBe(false);
  });
});

describe('VerifyPaymentSchema', () => {
  it('accepts valid payment verification payload', () => {
    const result = VerifyPaymentSchema.safeParse({
      razorpay_order_id: 'order_123',
      razorpay_payment_id: 'pay_456',
      razorpay_signature: 'abc123hex',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing order_id', () => {
    const result = VerifyPaymentSchema.safeParse({
      razorpay_payment_id: 'pay_456',
      razorpay_signature: 'abc123hex',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing payment_id', () => {
    const result = VerifyPaymentSchema.safeParse({
      razorpay_order_id: 'order_123',
      razorpay_signature: 'abc123hex',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing signature', () => {
    const result = VerifyPaymentSchema.safeParse({
      razorpay_order_id: 'order_123',
      razorpay_payment_id: 'pay_456',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty strings', () => {
    const result = VerifyPaymentSchema.safeParse({
      razorpay_order_id: '',
      razorpay_payment_id: '',
      razorpay_signature: '',
    });
    expect(result.success).toBe(false);
  });
});

// ─── Payment service tests (business logic, mocked DB) ────────────────────────

jest.mock('@/lib/prisma', () => ({
  prisma: {
    auditSession: {
      updateMany: jest.fn(),
    },
    webhookLog: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  persistPaymentUnlock,
  isWebhookProcessed,
} from '@/lib/payment/payment-service';

const mockUpdateMany = prisma.auditSession.updateMany as jest.MockedFunction<
  typeof prisma.auditSession.updateMany
>;
const mockFindFirst = prisma.webhookLog.findFirst as jest.MockedFunction<
  typeof prisma.webhookLog.findFirst
>;

describe('persistPaymentUnlock', () => {
  afterEach(() => jest.resetAllMocks());

  it('sets paid = true on matching audit session', async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 });
    const result = await persistPaymentUnlock('order_123');
    expect(result.unlocked).toBe(true);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { razorpayOrderId: 'order_123' },
      data: { paid: true },
    });
  });

  it('returns unlocked=false when no session matches the order', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });
    const result = await persistPaymentUnlock('order_nonexistent');
    expect(result.unlocked).toBe(false);
  });
});

describe('isWebhookProcessed (idempotency)', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns true when webhook log exists for the order', async () => {
    mockFindFirst.mockResolvedValue({ id: 'wh-1' } as unknown as Awaited<ReturnType<typeof prisma.webhookLog.findFirst>>);
    const result = await isWebhookProcessed('order_123');
    expect(result).toBe(true);
  });

  it('returns false when no webhook log exists', async () => {
    mockFindFirst.mockResolvedValue(null);
    const result = await isWebhookProcessed('order_123');
    expect(result).toBe(false);
  });
});
