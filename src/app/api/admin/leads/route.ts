/**
 * Admin leads API — GET (list/filter) + PATCH (status transition).
 * Delegates all business logic to leads-service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { getLeads, updateLeadStatus } from '@/lib/admin/leads-service';
import { LeadStatusUpdateSchema } from '@/lib/admin/validators';
import { ADMIN_ERR } from '@/config/admin-strings';
import { safeInt } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  const { searchParams } = request.nextUrl;
  const filters = {
    status: searchParams.get('status') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    page: safeInt(searchParams.get('page'), 1),
    limit: safeInt(searchParams.get('limit'), 50),
  };

  try {
    const result = await getLeads(filters);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[admin-leads] Query failed', { detail: String(err) });
    return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
  }

  const parsed = LeadStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: ADMIN_ERR.INVALID_REQUEST, details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await updateLeadStatus(
      parsed.data.leadId,
      parsed.data.newStatus,
      session.user.id,
    );
    if (!result.success) {
      const status = result.error === ADMIN_ERR.LEAD_NOT_FOUND ? 404 : 422;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json(result.lead);
  } catch (err) {
    console.error('[admin-leads] Status update failed', { detail: String(err) });
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}
