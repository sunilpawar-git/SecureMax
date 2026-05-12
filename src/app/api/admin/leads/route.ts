/**
 * Admin enterprise leads endpoint.
 * Placeholder — returns empty list until DB integration.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json([]);
}
