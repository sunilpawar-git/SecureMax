/**
 * Admin recent activity endpoint — last N admin actions for dashboard feed.
 */

import { apiSuccess, apiError } from '@/lib/api';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { getRecentActions } from '@/lib/admin/actions';
import { logger } from '@/lib/logger';

const DEFAULT_LIMIT = 10;

export async function GET() {
  if (!(await verifyAdmin())) {
    return forbiddenResponse();
  }

  try {
    const actions = await getRecentActions(DEFAULT_LIMIT);
    return apiSuccess(actions);
  } catch (err) {
    logger.error('Query failed', 'admin-recent-activity', { detail: String(err) });
    return apiError('Failed to load activity', 500);
  }
}
