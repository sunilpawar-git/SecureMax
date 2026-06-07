/**
 * Security configuration — SSOT for all security-related constants.
 * OWASP-aligned, DPDPA-compliant settings.
 */

/** Third-party origins the app must talk to. */
const RAZORPAY_CHECKOUT = 'https://checkout.razorpay.com';
const RAZORPAY_API = 'https://api.razorpay.com';
const TURNSTILE = 'https://challenges.cloudflare.com';

/**
 * Builds the Content-Security-Policy — SSOT consumed by both `SECURITY_HEADERS`
 * and `next.config.ts`. `'unsafe-eval'` is only permitted outside production
 * (React refresh in dev). Turnstile + Razorpay origins are explicitly allowlisted;
 * no wildcards.
 */
export function buildContentSecurityPolicy(isProd: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"} ${RAZORPAY_CHECKOUT} ${TURNSTILE}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    `connect-src 'self' ${RAZORPAY_API} ${TURNSTILE}`,
    `frame-src ${RAZORPAY_API} ${TURNSTILE}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': buildContentSecurityPolicy(process.env.NODE_ENV === 'production'),
} as const;

export const RATE_LIMITS = {
  AI_ENDPOINT_WINDOW_MS: 1000,
  AI_ENDPOINT_MAX_REQUESTS: 20,
  GLOBAL_WINDOW_MS: 60_000,
  GLOBAL_MAX_REQUESTS: 100,
  AUTH_WINDOW_MS: 60_000,
  AUTH_MAX_REQUESTS: 10,
  ADMIN_WINDOW_MS: 1_000,
  ADMIN_MAX_REQUESTS: 10,
} as const;

export const ENCRYPTION = {
  ALGORITHM: 'aes-256-gcm',
  IV_LENGTH: 16,
  TAG_LENGTH: 16,
  KEY_LENGTH: 32,
  KEY_VERSION_PREFIX: 'v1:',
} as const;

// __Host- prefix enforces Secure + no Domain — use only in production (HTTPS).
// In dev (HTTP/localhost) the browser silently drops __Host- cookies, breaking OAuth.
const isProd = process.env.NODE_ENV === 'production';

export const SESSION_SECURITY = {
  MAX_AGE_SECONDS: 24 * 60 * 60,
  COOKIE_NAME: isProd ? '__Host-next-auth.session-token' : 'next-auth.session-token',
  SAME_SITE: 'lax' as const,
  HTTP_ONLY: true,
  SECURE: isProd,
} as const;
