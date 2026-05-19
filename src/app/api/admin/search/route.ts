/**
 * Admin global search API — cross-entity search with grouped results.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { globalSearch } from '@/lib/admin/search-service';
import { ADMIN_ERR } from '@/config/admin-strings';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) return forbiddenResponse();

  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length > 200) {
    if (q && q.length > 200) {
      return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
    }
    return NextResponse.json({ users: [], sessions: [], leads: [], threatIntel: [] });
  }

  try {
    const results = await globalSearch(q);
    return NextResponse.json(results);
  } catch (err) {
    logger.error('Query failed', 'admin-search', { detail: String(err) });
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
