/**
 * Admin report diff endpoint — compares current vs previous report version.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { getReportDiff } from '@/lib/admin/reports-service';
import { isValidCuid } from '@/lib/utils';
import { logger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  if (!(await verifyAdmin())) return forbiddenResponse();

  const { sessionId } = await params;
  if (!isValidCuid(sessionId)) return apiError('Invalid session ID', 400);
  try {
    const diff = await getReportDiff(sessionId);
    if (!diff) {
      return apiError('No previous version for comparison', 404);
    }
    return apiSuccess(diff);
  } catch (err) {
    logger.error('Failed', 'admin-reports-diff', { detail: String(err) });
    return apiError('Diff generation failed', 500);
  }
}
