/**
 * Phase 2 — CAPTCHA bot protection (#12).
 * TDD: tests written BEFORE src/lib/security/turnstile.ts and the CSP refactor.
 *
 * Fail-closed contract:
 *  - No secret configured: skip in non-prod (true), fail-closed in prod (false).
 *  - Secret configured: token required; verified against Cloudflare siteverify.
 */

import { verifyTurnstile } from '@/lib/security/turnstile';
import { buildContentSecurityPolicy } from '@/config/security';

function setNodeEnv(value: string): void {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe('verifyTurnstile', () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
  const ORIGINAL_SECRET = process.env.TURNSTILE_SECRET_KEY;
  const realFetch = global.fetch;

  afterEach(() => {
    setNodeEnv(ORIGINAL_NODE_ENV ?? 'test');
    if (ORIGINAL_SECRET === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = ORIGINAL_SECRET;
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('skips verification in non-production when no secret is configured', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    setNodeEnv('test');
    await expect(verifyTurnstile('anything')).resolves.toBe(true);
  });

  it('fails closed in production when no secret is configured', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    setNodeEnv('production');
    await expect(verifyTurnstile('anything')).resolves.toBe(false);
  });

  it('returns false when a secret is set but no token is supplied', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'sec';
    await expect(verifyTurnstile(undefined)).resolves.toBe(false);
  });

  it('returns true when Cloudflare reports success', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'sec';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch;
    await expect(verifyTurnstile('token')).resolves.toBe(true);
  });

  it('returns false when Cloudflare reports failure', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'sec';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: false }),
    }) as unknown as typeof fetch;
    await expect(verifyTurnstile('token')).resolves.toBe(false);
  });

  it('returns false when the verification request throws', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'sec';
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch;
    await expect(verifyTurnstile('token')).resolves.toBe(false);
  });
});

describe('Content-Security-Policy (Turnstile origins)', () => {
  it('allows the Turnstile origin while staying restrictive', () => {
    const csp = buildContentSecurityPolicy(true);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('challenges.cloudflare.com');
  });

  it('keeps unsafe-eval out of production script-src', () => {
    expect(buildContentSecurityPolicy(true)).not.toContain("'unsafe-eval'");
    expect(buildContentSecurityPolicy(false)).toContain("'unsafe-eval'");
  });
});
