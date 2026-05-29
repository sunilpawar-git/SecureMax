/**
 * User management queries for the admin panel.
 * Read-only in v1 — returns enriched user rows with derived session metrics.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import type { UserFilter } from './validators';

export interface UserEntry {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  track: string;
  joinedAt: string;
  sessionCount: number;
  paidSessionCount: number;
  lastActiveAt: string | null;
}

export interface UsersResult {
  users: UserEntry[];
  total: number;
  page: number;
  limit: number;
}

type SessionRow = { paid: boolean; updatedAt: Date };

function deriveLastActive(sessions: SessionRow[]): string | null {
  if (sessions.length === 0) return null;
  const max = sessions.reduce<Date>(
    (acc, s) => (s.updatedAt > acc ? s.updatedAt : acc),
    sessions[0].updatedAt,
  );
  return max.toISOString();
}

export async function getUsers(filters: UserFilter): Promise<UsersResult> {
  const { track, search, page, limit } = filters;

  const where: Prisma.UserWhereInput = {};
  if (track) where.track = track;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        track: true,
        createdAt: true,
        auditSessions: { select: { paid: true, updatedAt: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      image: u.image,
      role: u.role,
      track: u.track,
      joinedAt: u.createdAt.toISOString(),
      sessionCount: u.auditSessions.length,
      paidSessionCount: u.auditSessions.filter((s) => s.paid).length,
      lastActiveAt: deriveLastActive(u.auditSessions),
    })),
    total,
    page,
    limit,
  };
}
