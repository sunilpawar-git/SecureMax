/**
 * Admin report unlock endpoint — sets enterpriseReportUnlocked flag.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { unlockReport } from '@/lib/admin/reports-service';
import { isValidCuid } from '@/lib/utils';
import { logger } from '@/lib/logger';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  const { sessionId } = await params;
  if (!isValidCuid(sessionId)) return apiError('Invalid session ID', 400);
  try {
    const result = await unlockReport(sessionId, session.user.id);
    if (!result.success) {
      return apiError(result.error ?? 'Not found', 404);
    }
    return apiSuccess({ success: true });
  } catch (err) {
    logger.error('Failed', 'admin-reports-unlock', { detail: String(err) });
    return apiError('Unlock failed', 500);
  }
}
