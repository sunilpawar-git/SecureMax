/**
 * Shared utility functions — pure, side-effect-free helpers.
 */

import { twMerge } from 'tailwind-merge';

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
 * Conditional className joiner for Tailwind. Filters out falsy parts (false,
 * null, undefined, '') then resolves utility conflicts via `twMerge` — e.g. a
 * caller-supplied `gap-3` correctly wins over a primitive's base `gap-2`
 * regardless of class declaration order in the generated stylesheet (a plain
 * string join would let either one win by accident). The DRY foundation for UI
 * primitives that accept a `className` override.
 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return twMerge(parts.filter(Boolean).join(' '));
}
