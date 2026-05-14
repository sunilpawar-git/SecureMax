/**
 * Resend email wrapper for enterprise lead communications.
 * Fails gracefully — logs errors but never throws to caller.
 */

import { APP } from '@/config/strings';

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

async function getResendClient(): Promise<ResendLike | null> {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[admin-email] RESEND_API_KEY not set');
    return null;
  }
  const { Resend } = await import('resend');
  resendClient = new Resend(apiKey) as unknown as ResendLike;
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
      console.error('[admin-email] Resend error', { detail: String(error) });
      return { success: false, error: 'Email delivery failed' };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    console.error('[admin-email] Unexpected error', { detail: String(err) });
    return { success: false, error: 'Email delivery failed' };
  }
}
