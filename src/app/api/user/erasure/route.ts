/**
 * DPDPA Right to Erasure endpoint.
 * Soft-deletes user data: anonymizes PII, marks sessions as erased.
 * The audit trail (immutable log) is retained with anonymized references.
 */

import { requireAuth, unauthorizedResponse, apiSuccess, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const session = await requireAuth();
  if (!session) return unauthorizedResponse();

  const userId = session.user.id;

  try {
    await prisma.$transaction(async (tx) => {
      const sessions = await tx.auditSession.findMany({
        where: { userId },
        select: { id: true },
      });
      const sessionIds = sessions.map((s) => s.id);

      await tx.auditSession.updateMany({
        where: { userId },
        data: {
          status: 'erased',
          domainScores: {},
          moduleScores: {},
          propertyType: null,
          facilityType: null,
        },
      });

      if (sessionIds.length > 0) {
        await tx.sessionEvent.updateMany({
          where: { sessionId: { in: sessionIds } },
          data: {
            answerEncrypted: '[ERASED]',
            aiReasoningEncrypted: null,
            anonymisedAt: new Date(),
          },
        });

        await tx.reportArtifact.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          name: '[ERASED]',
          email: `erased_${userId}@erased.local`,
          image: null,
          consentAt: null,
        },
      });
    });

    return apiSuccess({
      success: true,
      message: 'Your data has been erased. You will be signed out.',
    });
  } catch {
    return apiError('Failed to process erasure request. Please contact support.', 500);
  }
}
