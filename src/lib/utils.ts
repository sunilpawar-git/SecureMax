/**
 * Shared utility functions — pure, side-effect-free helpers.
 */

/**
 * Safely parse an integer from a query-string value.
 * Returns `fallback` for NaN, null, undefined, or empty string.
 */
export function safeInt(value: string | null | undefined, fallback: number): number {
  if (value == null || value === '') return fallback;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

/** Validates that a string is a plausible Prisma CUID (starts with 'c', 25 chars). */
export function isValidCuid(value: string): boolean {
  return /^c[a-z0-9]{24}$/.test(value);
}

/**
 * Conditional className joiner. Filters out falsy parts (false, null, undefined,
 * '') and joins the rest with a single space. The DRY foundation for UI primitives.
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
