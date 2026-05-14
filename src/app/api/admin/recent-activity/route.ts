/**
 * Admin recent activity endpoint — last N admin actions for dashboard feed.
 */

import { NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { getRecentActions } from '@/lib/admin/actions';

const DEFAULT_LIMIT = 10;

export async function GET() {
  if (!(await verifyAdmin())) {
    return forbiddenResponse();
  }

  try {
    const actions = await getRecentActions(DEFAULT_LIMIT);
    return NextResponse.json(actions);
  } catch (err) {
    console.error('[admin-recent-activity] Query failed', { detail: String(err) });
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 });
  }
}
