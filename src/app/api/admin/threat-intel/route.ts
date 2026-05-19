/**
 * Admin threat intel API — GET (filter), POST (manual add), DELETE (soft-delete).
 */

import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { getArticles, addManualArticle, deleteArticle } from '@/lib/admin/threat-intel-service';
import {
  ThreatIntelAddSchema,
  ThreatIntelDeleteSchema,
  ThreatIntelFilterSchema,
} from '@/lib/admin/validators';
import { ADMIN_ERR } from '@/config/admin-strings';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) return forbiddenResponse();

  const p = request.nextUrl.searchParams;
  const parsed = ThreatIntelFilterSchema.safeParse(Object.fromEntries(p));
  if (!parsed.success) {
    return apiError(ADMIN_ERR.INVALID_REQUEST, 400);
  }

  try {
    const result = await getArticles(parsed.data);
    return apiSuccess(result);
  } catch (err) {
    logger.error('Query failed', 'admin-threat-intel', { detail: String(err) });
    return apiError('Failed to load articles', 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(ADMIN_ERR.INVALID_REQUEST, 400);
  }

  const parsed = ThreatIntelAddSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ADMIN_ERR.INVALID_REQUEST, 400);
  }

  try {
    const result = await addManualArticle(parsed.data, session.user.id);
    if (!result.success) {
      return apiError(result.error ?? 'Conflict', 409);
    }
    return apiSuccess(result.article, 201);
  } catch (err) {
    logger.error('Add failed', 'admin-threat-intel', { detail: String(err) });
    return apiError('Failed to add article', 500);
  }
}

export async function DELETE(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(ADMIN_ERR.INVALID_REQUEST, 400);
  }

  const parsed = ThreatIntelDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ADMIN_ERR.INVALID_REQUEST, 400);
  }

  try {
    const result = await deleteArticle(parsed.data.articleId, session.user.id);
    if (!result.success) {
      const code = result.error === ADMIN_ERR.THREAT_INTEL_NOT_FOUND ? 404 : 409;
      return apiError(result.error ?? 'Unknown error', code);
    }
    return apiSuccess({ success: true });
  } catch (err) {
    logger.error('Delete failed', 'admin-threat-intel', { detail: String(err) });
    return apiError('Failed to delete article', 500);
  }
}
