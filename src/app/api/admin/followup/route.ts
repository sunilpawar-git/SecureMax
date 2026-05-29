/**
 * Admin HNI follow-up API — returns list of HNI users needing follow-up.
 * GET only. Delegates to followup-service.
 */

import { requireAdmin, forbiddenResponse, apiSuccess, apiError } from '@/lib/api';
import { getFollowUpList } from '@/lib/admin/followup-service';

export async function GET() {
  const session = await requireAdmin();
  if (!session) return forbiddenResponse();

  try {
    const items = await getFollowUpList();
    return apiSuccess({ items });
  } catch {
    return apiError('Failed to load follow-ups', 500);
  }
}
