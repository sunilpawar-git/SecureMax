/**
 * Resend email wrapper for enterprise lead communications.
 * Fails gracefully — logs errors but never throws to caller.
 */

import { APP } from '@/config/strings';
import { logger } from '@/lib/logger';
import { getSecret } from '@/lib/secrets';

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

type ResendLike = {
  emails: {
    send: (payload: {
      from: string;
      to: string[];
      subject: string;
      text: string;
    }) => Promise<{ data: { id: string } | null; error: unknown }>;
  };
};

let resendClient: ResendLike | null = null;
// Cache is keyed by the key value so a vault rotation rebuilds the client
let resendClientKey: string | null = null;

async function getResendClient(): Promise<ResendLike | null> {
  const apiKey = await getSecret('resend');
  if (!apiKey) {
    logger.error('Resend key not configured (vault or env)', 'admin-email');
    return null;
  }
  if (resendClient && resendClientKey === apiKey) return resendClient;
  const { Resend } = await import('resend');
  resendClient = new Resend(apiKey) as unknown as ResendLike;
  resendClientKey = apiKey;
  return resendClient;
}

export async function sendLeadEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const client = await getResendClient();
  if (!client) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await client.emails.send({
      from: `${APP.NAME} <noreply@${new URL(APP.URL).hostname}>`,
      to: [params.to],
      subject: params.subject,
      text: params.body,
    });

    if (error) {
      logger.error('Resend error', 'admin-email', { detail: String(error) });
      return { success: false, error: 'Email delivery failed' };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    logger.error('Unexpected error', 'admin-email', { detail: String(err) });
    return { success: false, error: 'Email delivery failed' };
  }
}
