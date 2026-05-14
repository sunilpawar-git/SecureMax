/**
 * Webhook logging — persists success/failure of external webhook events.
 * No PII stored in errorLog field.
 */

import { prisma } from '@/lib/prisma';
import { WEBHOOK_STATUS } from '@/config/admin-strings';

export async function logWebhookSuccess(provider: string, eventType: string) {
  return prisma.webhookLog.create({
    data: { provider, eventType, status: WEBHOOK_STATUS.SUCCESS },
  });
}

export async function logWebhookFailure(
  provider: string,
  eventType: string,
  errorMessage: string,
) {
  const sanitized = sanitizeError(errorMessage);
  return prisma.webhookLog.create({
    data: {
      provider,
      eventType,
      status: WEBHOOK_STATUS.FAILED,
      errorLog: sanitized,
    },
  });
}

function sanitizeError(msg: string): string {
  return msg
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL_REDACTED]')
    .replace(/\b\d{10,}\b/g, '[NUMBER_REDACTED]');
}
