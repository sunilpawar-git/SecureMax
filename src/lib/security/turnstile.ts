/**
 * Cloudflare Turnstile server-side verification.
 *
 * Fail-closed by design:
 *  - When no secret is configured, verification is skipped in non-production
 *    (so local/dev flows aren't blocked) but FAILS in production.
 *  - When a secret is configured, a valid token is mandatory and is verified
 *    against Cloudflare's siteverify endpoint.
 *
 * The secret never leaves the server. The public site key is exposed to the
 * browser via NEXT_PUBLIC_TURNSTILE_SITE_KEY (not a secret).
 */

import { env } from '@/lib/env';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface SiteverifyResponse {
  success?: boolean;
}

export async function verifyTurnstile(
  token: string | undefined,
  remoteIp?: string,
): Promise<boolean> {
  const secret = env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    // No secret configured: skip in dev/test, fail-closed in production.
    return env.NODE_ENV !== 'production';
  }

  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);

    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) return false;

    const data = (await res.json()) as SiteverifyResponse;
    return data.success === true;
  } catch {
    return false;
  }
}
