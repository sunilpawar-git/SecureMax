/**
 * DPDPA consent recording endpoint.
 * Sets User.consentAt on the authenticated user's record.
 */

import { requireAuth, unauthorizedResponse, apiSuccess, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const session = await requireAuth();
  if (!session) return unauthorizedResponse();

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { consentAt: new Date() },
    });

    return apiSuccess({ success: true, consentAt: new Date().toISOString() });
  } catch {
    return apiError('Failed to record consent', 500);
  }
}
