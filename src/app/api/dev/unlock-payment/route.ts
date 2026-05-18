/**
 * DEV-ONLY: Bypass Razorpay and mark an audit session as paid.
 *
 * This endpoint is a hard 404 in production — it only exists to speed up
 * local development of the report download flow without a real Razorpay key.
 *
 * POST /api/dev/unlock-payment  { session_id: string }
 */

import { NextRequest } from 'next/server';
import { requireAuth, unauthorizedResponse, apiSuccess, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return apiError('Not found', 404);
  }

  const session = await requireAuth();
  if (!session) return unauthorizedResponse();

  let body: { session_id?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body');
  }

  const { session_id } = body;
  if (!session_id || typeof session_id !== 'string') {
    return apiError('session_id is required');
  }

  const auditSession = await prisma.auditSession.findFirst({
    where: { id: session_id, userId: session.user.id },
  });

  if (!auditSession) {
    return apiError('Session not found', 404);
  }

  await prisma.auditSession.update({
    where: { id: session_id },
    data: { paid: true },
  });

  // Return the report job ID so the client can redirect to /report/[jobId]/download
  const reportJob = await prisma.reportJob.findUnique({
    where: { sessionId: session_id },
    select: { id: true },
  });

  return apiSuccess({ unlocked: true, session_id, report_job_id: reportJob?.id ?? null });
}
