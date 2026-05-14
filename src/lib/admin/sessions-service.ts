/**
 * Session management business logic — list, filter, force-close.
 */

import { prisma } from '@/lib/prisma';
import { logAdminAction } from './actions';
import {
  ADMIN_ACTION_TYPE,
  ADMIN_ENTITY_TYPE,
  ADMIN_ERR,
} from '@/config/admin-strings';
import { SESSION_STATUS } from '@/config/strings';

export interface SessionFilters {
  status?: string;
  track?: string;
  page?: number;
  limit?: number;
}

export async function getSessions(filters: SessionFilters = {}) {
  const { status, track, page = 1, limit = 50 } = filters;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (track) where.track = track;

  const [sessions, total] = await Promise.all([
    prisma.auditSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { email: true, name: true } },
      },
    }),
    prisma.auditSession.count({ where }),
  ]);

  return {
    sessions: sessions.map((s) => ({
      id: s.id,
      track: s.track,
      status: s.status,
      paid: s.paid,
      reportReady: s.reportReady,
      userEmail: s.user?.email ?? null,
      userName: s.user?.name ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

export interface ForceCloseResult {
  success: boolean;
  error?: string;
}

export async function forceCloseSession(
  sessionId: string,
  adminId: string,
): Promise<ForceCloseResult> {
  const session = await prisma.auditSession.findUnique({ where: { id: sessionId } });
  if (!session) return { success: false, error: ADMIN_ERR.SESSION_NOT_FOUND };

  if (session.status === SESSION_STATUS.COMPLETED || session.status === SESSION_STATUS.ABANDONED) {
    return { success: false, error: ADMIN_ERR.SESSION_ALREADY_CLOSED };
  }

  await prisma.auditSession.update({
    where: { id: sessionId },
    data: { status: SESSION_STATUS.ABANDONED },
  });

  await logAdminAction({
    adminId,
    actionType: ADMIN_ACTION_TYPE.SESSION_KILLED,
    entityType: ADMIN_ENTITY_TYPE.SESSION,
    entityId: sessionId,
  });

  return { success: true };
}
