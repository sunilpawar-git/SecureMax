/**
 * Admin users API — GET (list/filter, read-only v1).
 */

import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { getUsers } from '@/lib/admin/users-service';
import { UserFilterSchema } from '@/lib/admin/validators';
import { USERS_PAGE } from '@/config/admin-strings';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  const parsed = UserFilterSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return apiError(USERS_PAGE.ERR_INVALID_FILTER, 400);
  }

  try {
    const result = await getUsers(parsed.data);
    logger.info('Admin user list accessed', 'admin-users', {
      adminId: session.user.id,
      filters: parsed.data,
    });
    return apiSuccess(result);
  } catch (err) {
    logger.error('Query failed', 'admin-users', { detail: String(err) });
    return apiError(USERS_PAGE.ERR_LOAD_FAILED, 500);
  }
}
