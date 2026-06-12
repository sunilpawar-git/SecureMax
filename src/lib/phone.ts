/**
 * Phone number normalization — single source of truth for phone format.
 * Stored format: digits-only E.164 without '+' (e.g. "919876543210"),
 * directly compatible with wa.me URLs.
 */

// E.164 without '+': 8-15 digits, no leading zero
const PHONE_DIGITS_REGEX = /^[1-9]\d{7,14}$/;

/** Strips formatting (+, spaces, dashes, parens) and returns digits-only, or null if invalid. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s\-().+]/g, '');
  return PHONE_DIGITS_REGEX.test(digits) ? digits : null;
}
