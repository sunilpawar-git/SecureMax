/**
 * Tests for webhook logging — success, failure, PII sanitization.
 */

import { logWebhookSuccess, logWebhookFailure } from '@/lib/admin/webhook-service';
import { WEBHOOK_STATUS } from '@/config/admin-strings';

const mockCreate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    webhookLog: {
      create: (...a: unknown[]) => mockCreate(...a),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockResolvedValue({ id: 'wh-1' });
});

describe('logWebhookSuccess', () => {
  it('creates log with success status', async () => {
    await logWebhookSuccess('razorpay', 'payment.captured');

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        provider: 'razorpay',
        eventType: 'payment.captured',
        status: WEBHOOK_STATUS.SUCCESS,
      },
    });
  });
});

describe('logWebhookFailure', () => {
  it('creates log with failed status and error message', async () => {
    await logWebhookFailure('razorpay', 'payment.failed', 'Signature mismatch');

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        provider: 'razorpay',
        eventType: 'payment.failed',
        status: WEBHOOK_STATUS.FAILED,
        errorLog: 'Signature mismatch',
      },
    });
  });

  it('strips PII from error messages', async () => {
    const errorWithEmail = 'Payment failed for user@example.com with card 1234567890123456';
    await logWebhookFailure('razorpay', 'payment.failed', errorWithEmail);

    const callData = mockCreate.mock.calls[0][0].data;
    expect(callData.errorLog).not.toContain('user@example.com');
    expect(callData.errorLog).toContain('[EMAIL_REDACTED]');
    expect(callData.errorLog).toContain('[NUMBER_REDACTED]');
  });

  it('does not redact short numbers', async () => {
    await logWebhookFailure('razorpay', 'payment.failed', 'Error code 404');

    const callData = mockCreate.mock.calls[0][0].data;
    expect(callData.errorLog).toBe('Error code 404');
  });
});
