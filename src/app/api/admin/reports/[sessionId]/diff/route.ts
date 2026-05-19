/**
 * Admin report diff endpoint — compares current vs previous report version.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { getReportDiff } from '@/lib/admin/reports-service';
import { logger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  if (!(await verifyAdmin())) return forbiddenResponse();

  const { sessionId } = await params;
  try {
    const diff = await getReportDiff(sessionId);
    if (!diff) {
      return NextResponse.json({ error: 'No previous version for comparison' }, { status: 404 });
    }
    return NextResponse.json(diff);
  } catch (err) {
    logger.error('Failed', 'admin-reports-diff', { detail: String(err) });
    return NextResponse.json({ error: 'Diff generation failed' }, { status: 500 });
  }
}
