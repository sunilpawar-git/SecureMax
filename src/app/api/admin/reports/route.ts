/**
 * Admin reports API — GET (list) + POST (regenerate).
 * Delegates to reports-service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { getReports, regenerateReport } from '@/lib/admin/reports-service';
import { ReportRegenerateSchema } from '@/lib/admin/validators';
import { ADMIN_ERR } from '@/config/admin-strings';

export async function GET() {
  if (!(await verifyAdmin())) return forbiddenResponse();

  try {
    const reports = await getReports();
    return NextResponse.json(reports);
  } catch (err) {
    console.error('[admin-reports] Query failed', { detail: String(err) });
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
  }

  const parsed = ReportRegenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: ADMIN_ERR.INVALID_REQUEST, details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await regenerateReport(parsed.data.sessionId, session.user.id);
    if (!result.success) {
      const code =
        result.error === ADMIN_ERR.REPORT_REGEN_IN_PROGRESS ? 409
        : result.error === ADMIN_ERR.REPORT_REGEN_FAILED ? 503
        : 404;
      return NextResponse.json({ error: result.error }, { status: code });
    }
    return NextResponse.json({ jobId: result.jobId });
  } catch (err) {
    console.error('[admin-reports] Regen failed', { detail: String(err) });
    return NextResponse.json({ error: 'Regeneration failed' }, { status: 500 });
  }
}
