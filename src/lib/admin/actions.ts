/**
 * Admin action audit trail — immutable log of every admin operation.
 * Every destructive or state-changing admin action must call logAdminAction().
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';

interface LogActionParams {
  adminId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}

export async function logAdminAction(params: LogActionParams): Promise<string> {
  const record = await prisma.adminAction.create({
    data: {
      adminId: params.adminId,
      actionType: params.actionType,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata,
    },
  });
  return record.id;
}

export async function getRecentActions(limit: number = 10) {
  return prisma.adminAction.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
