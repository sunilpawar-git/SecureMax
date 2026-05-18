/**
 * Payment business logic — separated from the route handler.
 * Handles DB persistence for payment unlock and webhook idempotency.
 *
 * Idempotency: We check for an existing successful webhook log matching the
 * order ID (stored in the errorLog field as structured JSON, since the
 * WebhookLog schema has no dedicated externalId column).
 */

import { prisma } from '@/lib/prisma';

export interface PaymentUnlockResult {
  unlocked: boolean;
}

export async function persistPaymentUnlock(razorpayOrderId: string): Promise<PaymentUnlockResult> {
  const result = await prisma.auditSession.updateMany({
    where: { razorpayOrderId },
    data: { paid: true },
  });

  return { unlocked: result.count > 0 };
}

export async function isWebhookProcessed(razorpayOrderId: string): Promise<boolean> {
  const existing = await prisma.webhookLog.findFirst({
    where: {
      provider: 'razorpay',
      eventType: 'payment.verified',
      status: 'success',
      errorLog: { contains: `"order_id":"${razorpayOrderId}"` },
    },
  });

  return existing !== null;
}

export async function logPaymentVerification(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  status: 'success' | 'failed' | 'partial_failure',
  errorMessage?: string,
): Promise<void> {
  const meta = JSON.stringify({
    order_id: razorpayOrderId,
    payment_id: razorpayPaymentId,
    ...(errorMessage ? { error: errorMessage } : {}),
  });

  await prisma.webhookLog.create({
    data: {
      provider: 'razorpay',
      eventType: 'payment.verified',
      status,
      errorLog: meta,
    },
  });
}
