/**
 * RazorPay payment integration — HNI track.
 * Idempotent order creation, HMAC signature verification.
 */

import crypto from 'crypto';

const RAZORPAY_API = 'https://api.razorpay.com/v1';

function getSecret(): string {
  return process.env.RAZORPAY_SECRET || '';
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt: string;
}

export interface PaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function createOrder(reportId: string, amountInPaise: number): Promise<RazorpayOrder> {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const secret = getSecret();
  const authHeader = Buffer.from(`${keyId}:${secret}`).toString('base64');

  const response = await fetch(`${RAZORPAY_API}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `report_${reportId}`,
      notes: { report_id: reportId },
    }),
  });

  if (!response.ok) {
    throw new Error(`RazorPay order creation failed: ${response.status}`);
  }

  return response.json() as Promise<RazorpayOrder>;
}

export function verifySignature(payment: PaymentVerification): boolean {
  const secret = getSecret();
  if (!secret) {
    throw new Error('RAZORPAY_SECRET is not configured');
  }

  const body = `${payment.razorpay_order_id}|${payment.razorpay_payment_id}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');

  const expected = Buffer.from(expectedSignature, 'hex');
  const received = Buffer.from(payment.razorpay_signature, 'hex');

  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

export function getKeyId(): string {
  return process.env.RAZORPAY_KEY_ID || '';
}
