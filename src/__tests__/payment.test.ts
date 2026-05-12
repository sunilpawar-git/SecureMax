/**
 * Tests for payment modules — Phase 6 verification.
 */

import { verifySignature } from '@/lib/payment/razorpay';
import { validateProposal } from '@/lib/payment/enterprise';
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
    const signature = crypto
      .createHmac('sha256', TEST_SECRET)
      .update(body)
      .digest('hex');

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
    const signature = crypto
      .createHmac('sha256', TEST_SECRET)
      .update(body)
      .digest('hex');

    const result = verifySignature({
      razorpay_order_id: 'order_TAMPERED',
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    });
    expect(result).toBe(false);
  });
});

describe('Enterprise proposal validation', () => {
  const validProposal = {
    companyName: 'Amazon India',
    contactName: 'John Doe',
    contactEmail: 'john@amazon.com',
    facilityCount: 3,
    reportId: 'report_abc123',
  };

  it('should accept a valid proposal', () => {
    const result = validateProposal(validProposal);
    expect(result).not.toBeNull();
    expect(result!.companyName).toBe('Amazon India');
    expect(result!.facilityCount).toBe(3);
  });

  it('should reject missing company name', () => {
    const result = validateProposal({ ...validProposal, companyName: '' });
    expect(result).toBeNull();
  });

  it('should reject missing email', () => {
    const result = validateProposal({ ...validProposal, contactEmail: '' });
    expect(result).toBeNull();
  });

  it('should reject invalid email format', () => {
    const result = validateProposal({ ...validProposal, contactEmail: 'not-an-email' });
    expect(result).toBeNull();
  });

  it('should reject facility count less than 1', () => {
    const result = validateProposal({ ...validProposal, facilityCount: 0 });
    expect(result).toBeNull();
  });

  it('should reject missing report ID', () => {
    const result = validateProposal({ ...validProposal, reportId: '' });
    expect(result).toBeNull();
  });

  it('should accept optional fields', () => {
    const result = validateProposal({
      ...validProposal,
      contactPhone: '+91 9876543210',
      notes: 'Need urgent audit for Q4 compliance',
    });
    expect(result).not.toBeNull();
    expect(result!.contactPhone).toBe('+91 9876543210');
    expect(result!.notes).toBe('Need urgent audit for Q4 compliance');
  });

  it('should reject null input', () => {
    expect(validateProposal(null)).toBeNull();
  });

  it('should reject non-object input', () => {
    expect(validateProposal('string')).toBeNull();
  });

  it('should trim whitespace from fields', () => {
    const result = validateProposal({
      ...validProposal,
      companyName: '  Amazon India  ',
    });
    expect(result!.companyName).toBe('Amazon India');
  });
});
