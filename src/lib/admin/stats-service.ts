/**
 * Dashboard stats aggregation — all KPI queries in one place.
 * MVVM service layer: route delegates here, never queries Prisma directly.
 */

import { prisma } from '@/lib/prisma';
import { LEAD_STATUS, SCRAPER_RUN_STATUS } from '@/config/admin-strings';
import { SESSION_STATUS } from '@/config/strings';

export interface DashboardStats {
  activeSessions: number;
  completedSessions: number;
  pendingLeads: number;
  totalLeads: number;
  reportsGenerated: number;
  totalArticles: number;
  scraperHealthy: boolean;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    activeSessions,
    completedSessions,
    pendingLeads,
    totalLeads,
    reportsGenerated,
    totalArticles,
    latestScraperRun,
  ] = await Promise.all([
    prisma.auditSession.count({ where: { status: SESSION_STATUS.IN_PROGRESS } }),
    prisma.auditSession.count({ where: { status: SESSION_STATUS.COMPLETED } }),
    prisma.enterpriseLead.count({ where: { status: LEAD_STATUS.NEW } }),
    prisma.enterpriseLead.count(),
    prisma.reportArtifact.count(),
    prisma.threatIntel.count({ where: { softDeleted: false } }),
    prisma.scraperRun.findFirst({ orderBy: { startedAt: 'desc' } }),
  ]);

  const scraperHealthy = latestScraperRun
    ? latestScraperRun.status === SCRAPER_RUN_STATUS.COMPLETED
    : true;

  return {
    activeSessions,
    completedSessions,
    pendingLeads,
    totalLeads,
    reportsGenerated,
    totalArticles,
    scraperHealthy,
  };
}
