/**
 * Admin leads API — GET (list/filter) + PATCH (status transition).
 * Delegates all business logic to leads-service.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { getLeads, updateLeadStatus } from '@/lib/admin/leads-service';
import { LeadStatusUpdateSchema } from '@/lib/admin/validators';
import { ADMIN_ERR } from '@/config/admin-strings';
import { safeInt } from '@/lib/utils';
import { logger } from '@/lib/logger';

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
    return apiSuccess(result);
  } catch (err) {
    logger.error('Query failed', 'admin-leads', { detail: String(err) });
    return apiError('Failed to load leads', 500);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(ADMIN_ERR.INVALID_REQUEST, 400);
  }

  const parsed = LeadStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(ADMIN_ERR.INVALID_REQUEST, 400);
  }

  try {
    const result = await updateLeadStatus(
      parsed.data.leadId,
      parsed.data.newStatus,
      session.user.id,
    );
    if (!result.success) {
      const status = result.error === ADMIN_ERR.LEAD_NOT_FOUND ? 404 : 422;
      return apiError(result.error ?? 'Unknown error', status);
    }
    return apiSuccess(result.lead);
  } catch (err) {
    logger.error('Status update failed', 'admin-leads', { detail: String(err) });
    return apiError('Failed to update lead', 500);
  }
}
