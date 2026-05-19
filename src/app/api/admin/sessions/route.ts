/**
 * Admin sessions API — GET (list/filter) + PATCH (force-close).
 */

import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { getSessions, forceCloseSession } from '@/lib/admin/sessions-service';
import { SessionForceCloseSchema } from '@/lib/admin/validators';
import { ADMIN_ERR } from '@/config/admin-strings';
import { safeInt } from '@/lib/utils';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) return forbiddenResponse();

  const p = request.nextUrl.searchParams;
  const filters = {
    status: p.get('status') ?? undefined,
    track: p.get('track') ?? undefined,
    page: safeInt(p.get('page'), 1),
    limit: safeInt(p.get('limit'), 50),
  };

  try {
    const result = await getSessions(filters);
    return apiSuccess(result);
  } catch (err) {
    logger.error('Query failed', 'admin-sessions', { detail: String(err) });
    return apiError('Failed to load sessions', 500);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(ADMIN_ERR.INVALID_REQUEST, 400);
  }

  const parsed = SessionForceCloseSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ADMIN_ERR.INVALID_REQUEST, 400);
  }

  try {
    const result = await forceCloseSession(parsed.data.sessionId, session.user.id);
    if (!result.success) {
      const code = result.error === ADMIN_ERR.SESSION_NOT_FOUND ? 404 : 409;
      return apiError(result.error ?? 'Unknown error', code);
    }
    return apiSuccess({ success: true });
  } catch (err) {
    logger.error('Force close failed', 'admin-sessions', { detail: String(err) });
    return apiError('Failed to close session', 500);
  }
}
