/**
 * Action items aggregation — surfaces urgent items for the admin dashboard.
 * Queries overdue follow-ups, scraper failures, and unhandled new leads.
 */

import { prisma } from '@/lib/prisma';
import { FOLLOW_UP_STATUS, FOLLOW_UP_WINDOW_DAYS, LEAD_STATUS, SCRAPER_RUN_STATUS } from '@/config/admin-strings';

export interface ActionItems {
  overdueFollowUps: number;
  scraperFailures: number;
  newLeadsCount: number;
}

export async function getActionItems(): Promise<ActionItems> {
  const now = new Date();

  const [overdueFollowUps, scraperFailures, newLeadsCount] = await Promise.all([
    prisma.followUpReminder.count({
      where: {
        status: FOLLOW_UP_STATUS.PENDING,
        dueAt: { lte: now },
      },
    }),
    prisma.scraperRun.count({
      where: {
        status: SCRAPER_RUN_STATUS.FAILED,
        startedAt: { gte: new Date(now.getTime() - FOLLOW_UP_WINDOW_DAYS * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.enterpriseLead.count({ where: { status: LEAD_STATUS.NEW } }),
  ]);

  return { overdueFollowUps, scraperFailures, newLeadsCount };
}
