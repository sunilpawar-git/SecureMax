/**
 * Admin action items endpoint — surfaces urgent dashboard items.
 */

import { apiSuccess, apiError } from '@/lib/api';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { getActionItems } from '@/lib/admin/action-items-service';
import { logger } from '@/lib/logger';

export async function GET() {
  if (!(await verifyAdmin())) {
    return forbiddenResponse();
  }

  try {
    const items = await getActionItems();
    return apiSuccess(items);
  } catch (err) {
    logger.error('Query failed', 'admin-action-items', { detail: String(err) });
    return apiError('Failed to load action items', 500);
  }
}
