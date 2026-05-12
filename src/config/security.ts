/**
 * Security configuration — SSOT for all security-related constants.
 * OWASP-aligned, DPDPA-compliant settings.
 */

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.razorpay.com",
    'frame-src https://api.razorpay.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
} as const;

export const RATE_LIMITS = {
  AI_ENDPOINT_WINDOW_MS: 1000, // 1 second window for rate limiting
  AI_ENDPOINT_MAX_REQUESTS: 20, // Allow 20 requests per second for questionnaire endpoints
  GLOBAL_WINDOW_MS: 60_000,
  GLOBAL_MAX_REQUESTS: 100,
  AUTH_WINDOW_MS: 60_000,
  AUTH_MAX_REQUESTS: 10,
} as const;

export const ENCRYPTION = {
  ALGORITHM: 'aes-256-gcm',
  IV_LENGTH: 16,
  TAG_LENGTH: 16,
  KEY_LENGTH: 32,
} as const;

export const SESSION_SECURITY = {
  MAX_AGE_SECONDS: 24 * 60 * 60,
  COOKIE_NAME: '__Host-next-auth.session-token',
  SAME_SITE: 'lax' as const,
  HTTP_ONLY: true,
  SECURE: process.env.NODE_ENV === 'production',
} as const;
