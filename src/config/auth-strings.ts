/**
 * SSOT for authentication + onboarding-profile user-facing strings (sign-in,
 * auth-error, location profile). Split out of strings.ts to keep that file
 * under the 300-line gate, following the report-strings / legal-strings
 * precedent. Re-exported from strings.ts so `@/config/strings` stays the
 * import path for every consumer.
 *
 * NOTE: DPDPA consent copy is intentionally NOT here. Consent wording stays
 * inline in the consent page (restyle-only scope), and legal copy lives in
 * legal-strings.ts.
 */

export const AUTH = {
  SIGN_IN_TITLE_PREFIX: 'Sign in to',
  CONTINUE_GOOGLE: 'Continue with Google',
  CONTINUE_MICROSOFT: 'Continue with Microsoft',
  ERROR_TITLE: 'Authentication Error',
  ERROR_TRY_AGAIN: 'Try again',
  ERROR_BACK_PREFIX: 'Back to',
} as const;

/** NextAuth error-code → user-facing message. Keyed by the `error` query param. */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification link may have expired or already been used.',
  Default: 'An unexpected authentication error occurred.',
  OAuthSignin: 'Could not start the sign-in process. Please try again.',
  OAuthCallback: 'Sign-in was interrupted. Please try again.',
  OAuthAccountNotLinked: 'This email is already linked to another sign-in method.',
};

/** Onboarding location-profile copy + validation messages. */
export const ONBOARDING = {
  PROFILE_SUBTITLE: 'Location Information',
  PROFILE_HEADING: 'Where is your property located?',
  PROFILE_DESC:
    'This helps us tailor the security assessment to local threat landscapes and regulations.',
  COUNTRY_LABEL: 'Country',
  COUNTRY_PLACEHOLDER: 'Select country',
  CITY_LABEL: 'City',
  CITY_PLACEHOLDER: 'e.g. Mumbai, Dubai, London',
  PHONE_LABEL: 'Phone (optional)',
  PHONE_PLACEHOLDER: 'e.g. +91 98765 43210',
  PHONE_HINT: 'Include country code. Used only for audit follow-up — never shared.',
  PHONE_ERROR: 'Enter a valid phone number with country code',
  PROFILE_SUBMIT: 'Continue to Assessment',
  PROFILE_SUBMITTING: 'Saving...',
  PROFILE_ERROR_GENERIC: 'Something went wrong',
  PROFILE_ERROR_SAVE: 'Failed to save profile',
} as const;

/** Country options for the onboarding profile selector. */
export const ONBOARDING_COUNTRIES = [
  'India',
  'United Arab Emirates',
  'Singapore',
  'United Kingdom',
  'United States',
  'Saudi Arabia',
  'Qatar',
  'Bahrain',
  'Other',
] as const;
