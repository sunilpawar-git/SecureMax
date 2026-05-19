/**
 * Admin reports API — GET (list) + POST (regenerate).
 * Delegates to reports-service.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { getReports, regenerateReport } from '@/lib/admin/reports-service';
import { ReportRegenerateSchema } from '@/lib/admin/validators';
import { ADMIN_ERR } from '@/config/admin-strings';
import { logger } from '@/lib/logger';

export async function GET() {
  if (!(await verifyAdmin())) return forbiddenResponse();

  try {
    const reports = await getReports();
    return apiSuccess(reports);
  } catch (err) {
    logger.error('Query failed', 'admin-reports', { detail: String(err) });
    return apiError('Failed to load reports', 500);
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

  const parsed = ReportRegenerateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ADMIN_ERR.INVALID_REQUEST, 400);
  }

  try {
    const result = await regenerateReport(parsed.data.sessionId, session.user.id);
    if (!result.success) {
      const code =
        result.error === ADMIN_ERR.REPORT_REGEN_IN_PROGRESS
          ? 409
          : result.error === ADMIN_ERR.REPORT_REGEN_FAILED
            ? 503
            : 404;
      return apiError(result.error ?? 'Unknown error', code);
    }
    return apiSuccess({ jobId: result.jobId });
  } catch (err) {
    logger.error('Regen failed', 'admin-reports', { detail: String(err) });
    return apiError('Regeneration failed', 500);
  }
}
