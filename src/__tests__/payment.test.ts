/**
 * Tests for payment modules — Phase 6 verification.
 */

import { verifySignature } from '@/lib/payment/razorpay';
import crypto from 'crypto';

describe('RazorPay HMAC verification', () => {
  const TEST_SECRET = 'test_secret_key_123';

  beforeAll(() => {
    process.env.RAZORPAY_SECRET = TEST_SECRET;
  });

  it('should verify a valid signature', () => {
    const orderId = 'order_123';
    const paymentId = 'pay_456';
    const body = `${orderId}|${paymentId}`;
    const signature = crypto.createHmac('sha256', TEST_SECRET).update(body).digest('hex');

    const result = verifySignature({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    });
    expect(result).toBe(true);
  });

  it('should reject an invalid signature', () => {
    const result = verifySignature({
      razorpay_order_id: 'order_123',
      razorpay_payment_id: 'pay_456',
      razorpay_signature: 'invalid_signature',
    });
    expect(result).toBe(false);
  });

  it('should reject tampered order ID', () => {
    const orderId = 'order_123';
    const paymentId = 'pay_456';
    const body = `${orderId}|${paymentId}`;
    const signature = crypto.createHmac('sha256', TEST_SECRET).update(body).digest('hex');

    const result = verifySignature({
      razorpay_order_id: 'order_TAMPERED',
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    });
    expect(result).toBe(false);
  });
});

