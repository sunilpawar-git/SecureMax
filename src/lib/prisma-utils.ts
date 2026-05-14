/**
 * Prisma-related utility helpers.
 */

import type { Prisma } from '@/generated/prisma/client';

/**
 * Safely cast a plain object to Prisma's InputJsonValue.
 * Use instead of the double-cast pattern `as unknown as Prisma.InputJsonValue`.
 */
export function toJsonValue(obj: Record<string, unknown>): Prisma.InputJsonValue {
  return obj as unknown as Prisma.InputJsonValue;
}
