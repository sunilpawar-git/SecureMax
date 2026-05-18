/**
 * DPDPA consent recording endpoint.
 * Sets User.consentAt, consentVersion, and consentPurpose on the authenticated user.
 */

import { requireAuth, unauthorizedResponse, apiSuccess, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { DPDPA } from '@/config/strings';

export async function POST() {
  const session = await requireAuth();
  if (!session) return unauthorizedResponse();

  try {
    const now = new Date();
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        consentAt: now,
        consentVersion: DPDPA.CONSENT_VERSION,
        consentPurpose: DPDPA.CONSENT_PURPOSE,
      },
    });

    return apiSuccess({
      success: true,
      consentAt: now.toISOString(),
      consentVersion: DPDPA.CONSENT_VERSION,
      consentPurpose: DPDPA.CONSENT_PURPOSE,
    });
  } catch {
    return apiError('Failed to record consent', 500);
  }
}
