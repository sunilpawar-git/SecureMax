/**
 * Admin global search API — cross-entity search with grouped results.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { globalSearch } from '@/lib/admin/search-service';
import { SearchQuerySchema } from '@/lib/admin/validators';
import { ADMIN_ERR } from '@/config/admin-strings';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) return forbiddenResponse();

  const q = request.nextUrl.searchParams.get('q')?.trim();
  const parsed = SearchQuerySchema.safeParse({ q: q ?? '' });
  if (!parsed.success) {
    if (!q) return apiSuccess({ users: [], sessions: [], leads: [], threatIntel: [] });
    return apiError(ADMIN_ERR.INVALID_REQUEST, 400);
  }

  try {
    const results = await globalSearch(parsed.data.q);
    return apiSuccess(results);
  } catch (err) {
    logger.error('Query failed', 'admin-search', { detail: String(err) });
    return apiError('Search failed', 500);
  }
}
