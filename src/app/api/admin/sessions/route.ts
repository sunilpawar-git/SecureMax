/**
 * Admin sessions API — GET (list/filter) + PATCH (force-close).
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { getSessions, forceCloseSession } from '@/lib/admin/sessions-service';
import { SessionForceCloseSchema } from '@/lib/admin/validators';
import { ADMIN_ERR } from '@/config/admin-strings';
import { safeInt } from '@/lib/utils';

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) return forbiddenResponse();

  const p = request.nextUrl.searchParams;
  const filters = {
    status: p.get('status') ?? undefined,
    track: p.get('track') ?? undefined,
    page: safeInt(p.get('page'), 1),
    limit: safeInt(p.get('limit'), 50),
  };

  try {
    const result = await getSessions(filters);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[admin-sessions] Query failed', { detail: String(err) });
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 });
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

  const parsed = SessionForceCloseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
  }

  try {
    const result = await forceCloseSession(parsed.data.sessionId, session.user.id);
    if (!result.success) {
      const code = result.error === ADMIN_ERR.SESSION_NOT_FOUND ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status: code });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin-sessions] Force close failed', { detail: String(err) });
    return NextResponse.json({ error: 'Failed to close session' }, { status: 500 });
  }
}
