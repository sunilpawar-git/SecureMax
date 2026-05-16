/**
 * Public API for shared route helpers.
 * Import from '@/lib/api' in route handlers.
 */

export { requireAuth, requireAdmin, unauthorizedResponse, forbiddenResponse } from './guards';
export type { AuthenticatedSession } from './guards';

export { apiSuccess, apiError, apiValidationError } from './response';
export type { ValidationError } from './response';

export { parseBody, validateCuid } from './validate';
export type { ParseResult } from './validate';
