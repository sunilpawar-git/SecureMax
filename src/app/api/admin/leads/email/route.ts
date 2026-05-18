/**
 * Admin lead email endpoint — sends custom email to a lead via Resend.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { sendEmailToLead } from '@/lib/admin/leads-service';
import { LeadEmailSchema } from '@/lib/admin/validators';
import { ADMIN_ERR } from '@/config/admin-strings';

export async function POST(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
  }

  const parsed = LeadEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: ADMIN_ERR.INVALID_REQUEST, details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await sendEmailToLead(
      parsed.data.leadId,
      parsed.data.subject,
      parsed.data.body,
      session.user.id,
    );
    if (!result.success) {
      const status =
        result.error === ADMIN_ERR.LEAD_NOT_FOUND
          ? 404
          : result.error === ADMIN_ERR.LEAD_NO_EMAIL
            ? 422
            : 500;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin-leads-email] Send failed', { detail: String(err) });
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
