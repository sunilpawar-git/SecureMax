/**
 * Admin dashboard stats endpoint — real Prisma queries via stats-service.
 */

import { NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { getDashboardStats } from '@/lib/admin/stats-service';
import { logger } from '@/lib/logger';

export async function GET() {
  if (!(await verifyAdmin())) {
    return forbiddenResponse();
  }

  try {
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (err) {
    logger.error('Query failed', 'admin-stats', { detail: String(err) });
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
