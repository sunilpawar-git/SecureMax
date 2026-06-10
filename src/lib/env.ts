/**
 * Server environment — SSOT accessor + boot-time validation.
 *
 * Two responsibilities:
 *  1. `validateServerEnv()` — fail-loud at boot (called from instrumentation.ts)
 *     when a required secret is missing/placeholder in production.
 *  2. `env` — a typed accessor whose getters read `process.env` LIVE on every
 *     access (no memoization), preserving the lazy-read semantics that secret
 *     consumers (encryption, razorpay) and tests rely on.
 *
 * This module is server-only — never import it from a Client Component.
 */

import { z } from 'zod';

type EnvSource = Record<string, string | undefined>;

const PLACEHOLDER_VALUES = new Set([
  'generate-with-openssl-rand-base64-32',
  'generate-a-secure-random-key',
  'your-secret-here',
]);

export function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  if (PLACEHOLDER_VALUES.has(value)) return true;
  return value.startsWith('your-');
}

/** Secrets that MUST be present and real before the app boots in production. */
export const REQUIRED_IN_PROD = [
  'DATABASE_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'AI_SERVICE_URL',
  'AI_SERVICE_KEY',
  'ENCRYPTION_KEY',
] as const;

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

/**
 * Validates the server environment. No-op outside production; in production it
 * throws (naming every offending var) so misconfiguration fails loud at boot.
 */
export function validateServerEnv(source: EnvSource = process.env): { ok: true } {
  const node = baseSchema.safeParse(source);
  const nodeEnv = node.success ? node.data.NODE_ENV : 'development';
  if (nodeEnv !== 'production') return { ok: true };

  const missing = REQUIRED_IN_PROD.filter((key) => isPlaceholder(source[key]));
  if (missing.length > 0) {
    throw new Error(
      `Missing or placeholder environment variables required in production: ${missing.join(', ')}. ` +
        'Set real values before deploying.',
    );
  }

  // Turnstile is configured as a pair. Secret without site key: the UI renders
  // no captcha but the server fail-closes — every questionnaire start 403s.
  // Site key without secret: the captcha renders but is never verified.
  const hasSecret = !isPlaceholder(source.TURNSTILE_SECRET_KEY);
  const hasSiteKey = !isPlaceholder(source.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  if (hasSecret !== hasSiteKey) {
    throw new Error(
      'TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY must be set together ' +
        `(found ${hasSecret ? 'secret without site key' : 'site key without secret'}). ` +
        'Set both or neither.',
    );
  }
  return { ok: true };
}

function read(key: string): string {
  return process.env[key] ?? '';
}

/**
 * Typed, live accessor for server environment variables.
 * Getters intentionally re-read process.env on each access.
 */
export const env = {
  get NODE_ENV(): string {
    return process.env.NODE_ENV ?? 'development';
  },
  get DATABASE_URL(): string {
    return read('DATABASE_URL');
  },
  get NEXTAUTH_URL(): string {
    return read('NEXTAUTH_URL');
  },
  get NEXTAUTH_SECRET(): string {
    return read('NEXTAUTH_SECRET');
  },
  get AI_SERVICE_URL(): string {
    return read('AI_SERVICE_URL');
  },
  get AI_SERVICE_KEY(): string {
    return read('AI_SERVICE_KEY');
  },
  get ENCRYPTION_KEY(): string {
    return read('ENCRYPTION_KEY');
  },
  get ADMIN_EMAIL(): string {
    return read('ADMIN_EMAIL');
  },
  get RAZORPAY_KEY_ID(): string {
    return read('RAZORPAY_KEY_ID');
  },
  get RAZORPAY_SECRET(): string {
    return read('RAZORPAY_SECRET');
  },
  get RESEND_API_KEY(): string {
    return read('RESEND_API_KEY');
  },
  get GOOGLE_CLIENT_ID(): string {
    return read('GOOGLE_CLIENT_ID');
  },
  get GOOGLE_CLIENT_SECRET(): string {
    return read('GOOGLE_CLIENT_SECRET');
  },
  get AZURE_AD_CLIENT_ID(): string {
    return read('AZURE_AD_CLIENT_ID');
  },
  get AZURE_AD_CLIENT_SECRET(): string {
    return read('AZURE_AD_CLIENT_SECRET');
  },
  get NEWS_API_KEY(): string {
    return read('NEWS_API_KEY');
  },
  /** Consumed by the FastAPI service; read here only for vault import/visibility. */
  get GEMINI_API_KEY(): string {
    return read('GEMINI_API_KEY');
  },
  get LINKEDIN_ACCESS_TOKEN(): string {
    return read('LINKEDIN_ACCESS_TOKEN');
  },
  get LINKEDIN_ORG_ID(): string {
    return read('LINKEDIN_ORG_ID');
  },
  get TURNSTILE_SECRET_KEY(): string {
    return read('TURNSTILE_SECRET_KEY');
  },
  get UPSTASH_REDIS_REST_URL(): string {
    return read('UPSTASH_REDIS_REST_URL');
  },
  get UPSTASH_REDIS_REST_TOKEN(): string {
    return read('UPSTASH_REDIS_REST_TOKEN');
  },
} as const;
