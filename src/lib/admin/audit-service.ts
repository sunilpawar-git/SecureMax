/**
 * Audit log service — query admin actions with filtering and pagination.
 * AdminAction has no FK relation to User, so admin emails are resolved separately.
 */

import { prisma } from '@/lib/prisma';

export interface AuditLogFilters {
  startDate?: string;
  endDate?: string;
  actionType?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  adminEmail: string | null;
}

export async function getAuditLog(filters: AuditLogFilters = {}) {
  const { startDate, endDate, actionType, page = 1, limit = 50 } = filters;

  const where: Record<string, unknown> = {};
  if (actionType) where.actionType = actionType;
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    where.createdAt = dateFilter;
  }

  const [actions, total] = await Promise.all([
    prisma.adminAction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.adminAction.count({ where }),
  ]);

  const adminIds = [...new Set(actions.map((a) => a.adminId))];
  const admins =
    adminIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: adminIds } },
          select: { id: true, email: true },
        })
      : [];
  const emailMap = new Map(admins.map((u) => [u.id, u.email]));

  const entries: AuditLogEntry[] = actions.map((a) => ({
    id: a.id,
    adminId: a.adminId,
    actionType: a.actionType,
    entityType: a.entityType,
    entityId: a.entityId,
    metadata: a.metadata as Record<string, unknown> | null,
    createdAt: a.createdAt.toISOString(),
    adminEmail: emailMap.get(a.adminId) ?? null,
  }));

  return { entries, total, page, limit };
}
