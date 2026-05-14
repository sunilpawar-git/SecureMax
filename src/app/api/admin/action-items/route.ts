/**
 * Admin action items endpoint — surfaces urgent dashboard items.
 */

import { NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { getActionItems } from '@/lib/admin/action-items-service';

export async function GET() {
  if (!(await verifyAdmin())) {
    return forbiddenResponse();
  }

  try {
    const items = await getActionItems();
    return NextResponse.json(items);
  } catch (err) {
    console.error('[admin-action-items] Query failed', { detail: String(err) });
    return NextResponse.json({ error: 'Failed to load action items' }, { status: 500 });
  }
}
