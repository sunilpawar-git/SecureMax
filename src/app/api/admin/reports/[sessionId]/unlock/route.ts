/**
 * Admin report unlock endpoint — sets enterpriseReportUnlocked flag.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { unlockReport } from '@/lib/admin/reports-service';
import { logger } from '@/lib/logger';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  const { sessionId } = await params;
  try {
    const result = await unlockReport(sessionId, session.user.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Failed', 'admin-reports-unlock', { detail: String(err) });
    return NextResponse.json({ error: 'Unlock failed' }, { status: 500 });
  }
}
