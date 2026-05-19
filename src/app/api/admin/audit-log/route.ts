/**
 * Admin audit log API — GET (list/filter) + CSV export.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { getAuditLog } from '@/lib/admin/audit-service';
import { auditLogToCsv } from '@/lib/admin/csv-export';
import { AuditLogFilterSchema } from '@/lib/admin/validators';
import { ADMIN_ERR } from '@/config/admin-strings';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) return forbiddenResponse();

  const p = request.nextUrl.searchParams;
  const parsed = AuditLogFilterSchema.safeParse(Object.fromEntries(p));
  if (!parsed.success) {
    return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
  }
  const { format, ...filters } = parsed.data;

  try {
    const result = await getAuditLog(filters);

    if (format === 'csv') {
      const csv = auditLogToCsv(result.entries);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-log-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    logger.error('Query failed', 'admin-audit-log', { detail: String(err) });
    return NextResponse.json({ error: 'Failed to load audit log' }, { status: 500 });
  }
}
