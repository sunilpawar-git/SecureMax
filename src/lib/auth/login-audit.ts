/**
 * Admin sign-in audit — immutable AdminAction trail of every admin login
 * (Rule 15). Kept out of index.ts so it stays unit-testable: next-auth is
 * ESM-only and cannot be imported in Jest.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ADMIN_ACTION_TYPE, ADMIN_ENTITY_TYPE } from '@/config/admin-strings';

/** Fire-and-forget: an audit failure must never block the login itself. */
export async function logAdminLogin(userId: string, provider: string): Promise<void> {
  try {
    await prisma.adminAction.create({
      data: {
        adminId: userId,
        actionType: ADMIN_ACTION_TYPE.ADMIN_LOGIN,
        entityType: ADMIN_ENTITY_TYPE.USER,
        entityId: userId,
        metadata: { provider },
      },
    });
  } catch (err) {
    logger.error('Admin login audit failed', 'auth', { detail: String(err) });
  }
}
