/**
 * Request body parsing with Zod validation.
 * Returns a discriminated union — callers handle success/error without exceptions.
 */

import type { ZodSchema, ZodError } from 'zod';
import type { ValidationError } from './response';

const CUID_PATTERN = /^c[a-z0-9]{7,39}$/;

/**
 * Validates that a string is a safe CUID/CUID2 identifier.
 * Rejects path traversal, query injection, and malformed IDs.
 */
export function validateCuid(value: string): boolean {
  return CUID_PATTERN.test(value);
}

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

function zodToValidationErrors(zodError: ZodError): ValidationError[] {
  return zodError.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}

export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      success: false,
      errors: [{ field: 'body', message: 'Invalid or missing JSON body' }],
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return { success: false, errors: zodToValidationErrors(result.error) };
  }

  return { success: true, data: result.data };
}
