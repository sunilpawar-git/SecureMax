/**
 * Admin action items endpoint — surfaces urgent dashboard items.
 */

import { NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { getActionItems } from '@/lib/admin/action-items-service';
import { logger } from '@/lib/logger';

export async function GET() {
  if (!(await verifyAdmin())) {
    return forbiddenResponse();
  }

  try {
    const items = await getActionItems();
    return NextResponse.json(items);
  } catch (err) {
    logger.error('Query failed', 'admin-action-items', { detail: String(err) });
    return NextResponse.json({ error: 'Failed to load action items' }, { status: 500 });
  }
}
