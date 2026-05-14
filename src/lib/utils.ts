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
