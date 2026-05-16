/**
 * Dashboard sessions endpoint — returns all audit sessions for the current user.
 */

import { NextRequest } from 'next/server';
import { requireAuth, unauthorizedResponse, apiSuccess, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest) {
  const session = await requireAuth();
  if (!session) return unauthorizedResponse();

  try {
    const raw = await prisma.auditSession.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        track: true,
        paid: true,
        reportReady: true,
        createdAt: true,
        _count: { select: { events: true } },
      },
    });

    const sessions = raw.map((s) => ({
      id: s.id,
      status: s.status,
      track: s.track,
      paid: s.paid,
      reportReady: s.reportReady,
      questionsAnswered: s._count.events,
      createdAt: s.createdAt.toISOString(),
    }));

    return apiSuccess({ sessions });
  } catch {
    return apiError('Failed to load sessions', 500);
  }
}
