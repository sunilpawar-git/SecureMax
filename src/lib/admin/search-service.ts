/**
 * Global admin search — parallel queries across users, sessions, leads, threat intel.
 * Results capped per entity type for performance.
 */

import { prisma } from '@/lib/prisma';
import { SEARCH_RESULTS_PER_TYPE } from '@/config/admin-strings';

export interface SearchResults {
  users: { id: string; email: string | null; name: string | null }[];
  sessions: { id: string; track: string; status: string; userEmail: string | null }[];
  leads: { id: string; company: string; name: string; status: string }[];
  threatIntel: { id: string; title: string; source: string }[];
}

export async function globalSearch(query: string): Promise<SearchResults> {
  const cap = SEARCH_RESULTS_PER_TYPE;

  const [users, sessions, leads, threatIntel] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true, name: true },
      take: cap,
    }),
    prisma.auditSession.findMany({
      where: {
        OR: [
          { id: { startsWith: query } },
          { user: { email: { contains: query, mode: 'insensitive' } } },
        ],
      },
      select: {
        id: true,
        track: true,
        status: true,
        user: { select: { email: true } },
      },
      take: cap,
    }),
    prisma.enterpriseLead.findMany({
      where: {
        OR: [
          { company: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, company: true, name: true, status: true },
      take: cap,
    }),
    prisma.threatIntel.findMany({
      where: {
        softDeleted: false,
        title: { contains: query, mode: 'insensitive' },
      },
      select: { id: true, title: true, source: true },
      take: cap,
    }),
  ]);

  return {
    users,
    sessions: sessions.map((s) => ({
      id: s.id,
      track: s.track,
      status: s.status,
      userEmail: s.user?.email ?? null,
    })),
    leads,
    threatIntel,
  };
}
