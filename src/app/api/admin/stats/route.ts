/**
 * Admin dashboard stats endpoint — real Prisma queries via stats-service.
 */

import { apiSuccess, apiError } from '@/lib/api';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { getDashboardStats } from '@/lib/admin/stats-service';
import { logger } from '@/lib/logger';

export async function GET() {
  if (!(await verifyAdmin())) {
    return forbiddenResponse();
  }

  try {
    const stats = await getDashboardStats();
    return apiSuccess(stats);
  } catch (err) {
    logger.error('Query failed', 'admin-stats', { detail: String(err) });
    return apiError('Failed to load stats', 500);
  }
}
