/**
 * Payment amount constants — extracted from strings.ts so landing-strings.ts
 * can derive the display price without a circular import (strings.ts
 * re-exports landing-strings). Re-exported from strings.ts, so consumers keep
 * importing PAYMENT from '@/config/strings'.
 */

export const PAYMENT = {
  CURRENCY: 'INR',
  AMOUNT_PAISE: 499900,
} as const;

/** User-facing copy for the payment page (string SSOT — no inline JSX copy). */
export const PAYMENT_PAGE = {
  SUBTITLE: 'Unlock Your Full Security Report',
  ONE_TIME: 'One-time payment',
  FEATURES: [
    'Complete findings with detailed recommendations',
    'CPP Seven Precis domain-mapped vulnerabilities',
    'Threat intelligence enrichment',
    'Downloadable PDF audit report',
    'Priority booking for physical on-site audit',
  ],
  BTN_PREPARING: 'Preparing payment...',
  BTN_CHECKOUT_OPEN: 'Complete payment in Razorpay...',
  BTN_VERIFYING: 'Verifying payment...',
  BTN_VERIFIED: 'Payment verified!',
  BTN_PAY_PREFIX: 'Pay',
  DEV_MODE_NOTE: '⚙ Dev mode — skip real payment',
  DEV_BYPASS_CTA: 'Bypass Payment (Dev)',
  DEV_UNLOCKING: 'Unlocking...',
} as const;
