/**
 * Admin analytics endpoint — aggregated session, revenue, and domain statistics.
 * Uses Prisma aggregate/groupBy for scalable queries instead of loading all rows.
 */

import { Prisma } from '@/generated/prisma/client';
import { requireAdmin, forbiddenResponse, apiSuccess, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';

const AMOUNT_PER_REPORT_PAISE = 4999_00;

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return forbiddenResponse();

  try {
    const [totalCount, statusCounts, paidCount, eventAggregate] = await Promise.all([
      prisma.auditSession.count(),
      prisma.auditSession.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.auditSession.count({ where: { paid: true } }),
      prisma.sessionEvent.count(),
    ]);

    const completed = statusCounts.find((s) => s.status === 'completed')?._count.id ?? 0;
    const abandoned = statusCounts.find((s) => s.status === 'abandoned')?._count.id ?? 0;
    const avgQuestionsPerSession = totalCount > 0 ? Math.round(eventAggregate / totalCount) : 0;

    const amountCollected = paidCount * AMOUNT_PER_REPORT_PAISE;
    const conversionRate = completed > 0 ? Math.round((paidCount / completed) * 100) : 0;

    const sessionsWithScores = await prisma.auditSession.findMany({
      where: { domainScores: { not: Prisma.DbNull } },
      select: { domainScores: true },
      take: 500,
    });

    const domainAggregates: Record<string, { totalScore: number; count: number }> = {};
    for (const session of sessionsWithScores) {
      if (session.domainScores && typeof session.domainScores === 'object') {
        const scores = session.domainScores as Record<string, number>;
        for (const [code, score] of Object.entries(scores)) {
          if (typeof score === 'number') {
            if (!domainAggregates[code]) domainAggregates[code] = { totalScore: 0, count: 0 };
            domainAggregates[code].totalScore += score;
            domainAggregates[code].count += 1;
          }
        }
      }
    }

    const domains: Record<string, { avgScore: number; questionCount: number }> = {};
    for (const [code, agg] of Object.entries(domainAggregates)) {
      domains[code] = {
        avgScore: Math.round(agg.totalScore / agg.count),
        questionCount: agg.count,
      };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSessions = await prisma.auditSession.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, status: true },
    });

    const trendMap: Record<string, { sessions: number; completions: number }> = {};
    for (let d = 0; d < 30; d++) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const key = date.toISOString().split('T')[0];
      trendMap[key] = { sessions: 0, completions: 0 };
    }
    for (const s of recentSessions) {
      const key = s.createdAt.toISOString().split('T')[0];
      if (trendMap[key]) {
        trendMap[key].sessions += 1;
        if (s.status === 'completed') trendMap[key].completions += 1;
      }
    }

    const trends = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    return apiSuccess({
      sessions: { total: totalCount, completed, abandoned, avgQuestionsPerSession },
      revenue: { totalPaid: paidCount, amountCollected, conversionRate },
      domains,
      trends,
    });
  } catch {
    return apiError('Failed to load analytics', 500);
  }
}
