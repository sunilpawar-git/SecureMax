/**
 * Analytics extensions — funnel, payment split, session health, LinkedIn ROI.
 * Pure read-only aggregation; the base KPIs (sessions/revenue/domains/trends)
 * stay in the /api/admin/analytics route — these add what it doesn't compute.
 * Every function returns zeroed shapes on an empty DB, never throws for that.
 */

import { prisma } from '@/lib/prisma';
import { SESSION_STATUS } from '@/config/strings';
import { ANALYTICS_STRINGS } from '@/config/analytics-strings';

// ---------- Revenue split (Razorpay vs coupon vs manual unlock) ----------

export interface RevenueSplit {
  totalPaid: number;
  couponPaid: number;
  razorpayPaid: number;
  /** Admin mark-paid / other unlocks without a coupon or Razorpay order. */
  manualPaid: number;
}

/**
 * Buckets are computed by explicit predicates, never by subtraction:
 * a coupon link (set only at redemption) takes precedence over a Razorpay
 * order id, which can exist on a session that later redeemed a coupon.
 */
export async function getRevenueSplit(): Promise<RevenueSplit> {
  const [totalPaid, couponPaid, razorpayPaid] = await Promise.all([
    prisma.auditSession.count({ where: { paid: true } }),
    prisma.auditSession.count({ where: { paid: true, coupon: { isNot: null } } }),
    prisma.auditSession.count({
      where: { paid: true, coupon: { is: null }, razorpayOrderId: { not: null } },
    }),
  ]);
  return {
    totalPaid,
    couponPaid,
    razorpayPaid,
    manualPaid: Math.max(totalPaid - couponPaid - razorpayPaid, 0),
  };
}

// ---------- Conversion funnel ----------

export interface FunnelStage {
  stage: string;
  count: number;
  /** Percentage lost relative to the previous stage (0 for the first). */
  dropOffPct: number;
}

/**
 * Signed up → started → completed → paid → downloaded.
 * First stage is "Signed Up" — no landing-page visitor analytics exist yet
 * (future GA4/Plausible stage hooks in before it).
 */
export async function getFunnelMetrics(): Promise<FunnelStage[]> {
  const [users, started, completed, paid, downloaded] = await Promise.all([
    prisma.user.count(),
    prisma.auditSession.count(),
    prisma.auditSession.count({ where: { status: SESSION_STATUS.COMPLETED } }),
    prisma.auditSession.count({ where: { paid: true } }),
    prisma.auditSession.count({ where: { downloadedAt: { not: null } } }),
  ]);

  const S = ANALYTICS_STRINGS.FUNNEL_STAGES;
  const ordered: Array<[string, number]> = [
    [S.SIGNED_UP, users],
    [S.STARTED, started],
    [S.COMPLETED, completed],
    [S.PAID, paid],
    [S.DOWNLOADED, downloaded],
  ];

  return ordered.map(([stage, count], i) => {
    const prev = i === 0 ? count : ordered[i - 1][1];
    const dropOffPct = i === 0 || prev === 0 ? 0 : Math.round(((prev - count) / prev) * 100);
    return { stage, count, dropOffPct };
  });
}

// ---------- Session health ----------

export interface AbandonmentNode {
  nodeId: string;
  count: number;
}

export interface SessionHealth {
  avgCompletionMs: number;
  abandonmentNodes: AbandonmentNode[];
}

export async function getSessionHealthMetrics(): Promise<SessionHealth> {
  const [completedSessions, abandonedGroups] = await Promise.all([
    prisma.auditSession.findMany({
      where: { status: SESSION_STATUS.COMPLETED },
      select: { createdAt: true, updatedAt: true },
      take: 500,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditSession.groupBy({
      by: ['currentNodeId'],
      where: { status: SESSION_STATUS.ABANDONED, currentNodeId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
  ]);

  const totalMs = completedSessions.reduce(
    (sum, s) => sum + (s.updatedAt.getTime() - s.createdAt.getTime()),
    0,
  );
  const avgCompletionMs =
    completedSessions.length > 0 ? Math.round(totalMs / completedSessions.length) : 0;

  const abandonmentNodes = abandonedGroups
    .filter((g): g is typeof g & { currentNodeId: string } => g.currentNodeId !== null)
    .map((g) => ({ nodeId: g.currentNodeId, count: g._count.id }));

  return { avgCompletionMs, abandonmentNodes };
}

// ---------- LinkedIn ROI (posts/week vs signups/week, last 8 weeks) ----------

export interface WeeklyRoiPoint {
  /** ISO date (Monday) of the week start. */
  weekStart: string;
  posts: number;
  signups: number;
}

const ROI_WEEKS = 8;

function mondayOf(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7)); // shift back to Monday
  return d.toISOString().split('T')[0];
}

export async function getLinkedInROI(): Promise<WeeklyRoiPoint[]> {
  const since = new Date(Date.now() - ROI_WEEKS * 7 * 86_400_000);

  const [posts, users] = await Promise.all([
    prisma.linkedinPost.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  // Seed all 8 buckets so weeks with zero activity still chart
  const buckets = new Map<string, { posts: number; signups: number }>();
  for (let w = ROI_WEEKS - 1; w >= 0; w--) {
    const key = mondayOf(new Date(Date.now() - w * 7 * 86_400_000));
    buckets.set(key, { posts: 0, signups: 0 });
  }
  for (const p of posts) {
    const b = buckets.get(mondayOf(p.createdAt));
    if (b) b.posts += 1;
  }
  for (const u of users) {
    const b = buckets.get(mondayOf(u.createdAt));
    if (b) b.signups += 1;
  }

  return Array.from(buckets.entries()).map(([weekStart, v]) => ({ weekStart, ...v }));
}
