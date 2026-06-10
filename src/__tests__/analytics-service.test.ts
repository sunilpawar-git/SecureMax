/**
 * Phase 10 tests — analytics-service.
 * Intent: every metric function returns the documented shape, computes
 * drop-offs/splits correctly, and returns zeroed shapes (never throws) on an
 * empty database.
 */

const mockSessionCount = jest.fn();
const mockSessionFindMany = jest.fn();
const mockSessionGroupBy = jest.fn();
const mockCouponCount = jest.fn();
const mockUserCount = jest.fn();
const mockUserFindMany = jest.fn();
const mockPostFindMany = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    auditSession: {
      count: (...a: unknown[]) => mockSessionCount(...a),
      findMany: (...a: unknown[]) => mockSessionFindMany(...a),
      groupBy: (...a: unknown[]) => mockSessionGroupBy(...a),
    },
    couponCode: { count: (...a: unknown[]) => mockCouponCount(...a) },
    user: {
      count: (...a: unknown[]) => mockUserCount(...a),
      findMany: (...a: unknown[]) => mockUserFindMany(...a),
    },
    linkedinPost: { findMany: (...a: unknown[]) => mockPostFindMany(...a) },
  },
}));

import {
  getRevenueSplit,
  getFunnelMetrics,
  getSessionHealthMetrics,
  getLinkedInROI,
} from '@/lib/admin/analytics-service';
import { ANALYTICS_STRINGS } from '@/config/analytics-strings';

beforeEach(() => {
  jest.clearAllMocks();
  mockSessionCount.mockResolvedValue(0);
  mockSessionFindMany.mockResolvedValue([]);
  mockSessionGroupBy.mockResolvedValue([]);
  mockCouponCount.mockResolvedValue(0);
  mockUserCount.mockResolvedValue(0);
  mockUserFindMany.mockResolvedValue([]);
  mockPostFindMany.mockResolvedValue([]);
});

describe('getRevenueSplit', () => {
  it('buckets coupon, Razorpay, and manual unlocks by explicit predicates', async () => {
    mockSessionCount
      .mockResolvedValueOnce(10) // paid: true
      .mockResolvedValueOnce(3) // coupon-linked
      .mockResolvedValueOnce(5); // razorpay order, no coupon
    expect(await getRevenueSplit()).toEqual({
      totalPaid: 10,
      couponPaid: 3,
      razorpayPaid: 5,
      manualPaid: 2, // admin mark-paid / dev bypass — NOT counted as Razorpay
    });
  });

  it('counts Razorpay only for coupon-less sessions with an order id', async () => {
    await getRevenueSplit();
    expect(mockSessionCount).toHaveBeenNthCalledWith(2, {
      where: { paid: true, coupon: { isNot: null } },
    });
    expect(mockSessionCount).toHaveBeenNthCalledWith(3, {
      where: { paid: true, coupon: { is: null }, razorpayOrderId: { not: null } },
    });
  });

  it('never returns a negative manual count', async () => {
    mockSessionCount.mockResolvedValueOnce(2).mockResolvedValueOnce(5).mockResolvedValueOnce(4);
    expect((await getRevenueSplit()).manualPaid).toBe(0);
  });

  it('returns zeroes on an empty DB', async () => {
    expect(await getRevenueSplit()).toEqual({
      totalPaid: 0,
      couponPaid: 0,
      razorpayPaid: 0,
      manualPaid: 0,
    });
  });
});

describe('getFunnelMetrics', () => {
  it('returns 5 stages with drop-off percentages relative to the previous stage', async () => {
    mockUserCount.mockResolvedValue(100);
    // auditSession.count is called 4 times: started, completed, paid, downloaded
    mockSessionCount
      .mockResolvedValueOnce(80)
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8);

    const funnel = await getFunnelMetrics();
    expect(funnel).toHaveLength(5);
    expect(funnel[0]).toEqual({
      stage: ANALYTICS_STRINGS.FUNNEL_STAGES.SIGNED_UP,
      count: 100,
      dropOffPct: 0,
    });
    expect(funnel[1].dropOffPct).toBe(20); // 100 → 80
    expect(funnel[2].dropOffPct).toBe(50); // 80 → 40
    expect(funnel[3].dropOffPct).toBe(75); // 40 → 10
    expect(funnel[4].dropOffPct).toBe(20); // 10 → 8
  });

  it('returns all-zero stages on an empty DB without dividing by zero', async () => {
    const funnel = await getFunnelMetrics();
    expect(funnel).toHaveLength(5);
    for (const stage of funnel) {
      expect(stage.count).toBe(0);
      expect(stage.dropOffPct).toBe(0);
    }
  });
});

describe('getSessionHealthMetrics', () => {
  it('averages completion time and ranks abandonment nodes', async () => {
    const base = new Date('2026-06-01T10:00:00Z').getTime();
    mockSessionFindMany.mockResolvedValue([
      { createdAt: new Date(base), updatedAt: new Date(base + 600_000) }, // 10m
      { createdAt: new Date(base), updatedAt: new Date(base + 1_200_000) }, // 20m
    ]);
    mockSessionGroupBy.mockResolvedValue([
      { currentNodeId: 'hni_q7_cctv', _count: { id: 9 } },
      { currentNodeId: 'hni_q3_perimeter', _count: { id: 4 } },
    ]);

    const health = await getSessionHealthMetrics();
    expect(health.avgCompletionMs).toBe(900_000); // 15m
    expect(health.abandonmentNodes).toEqual([
      { nodeId: 'hni_q7_cctv', count: 9 },
      { nodeId: 'hni_q3_perimeter', count: 4 },
    ]);
  });

  it('returns zeroed shape on an empty DB', async () => {
    expect(await getSessionHealthMetrics()).toEqual({
      avgCompletionMs: 0,
      abandonmentNodes: [],
    });
  });
});

describe('getLinkedInROI', () => {
  it('returns 8 weekly buckets with posts and signups counted into them', async () => {
    const now = Date.now();
    mockPostFindMany.mockResolvedValue([
      { createdAt: new Date(now - 86_400_000) },
      { createdAt: new Date(now - 2 * 86_400_000) },
    ]);
    mockUserFindMany.mockResolvedValue([{ createdAt: new Date(now - 86_400_000) }]);

    const points = await getLinkedInROI();
    expect(points).toHaveLength(8);
    const totals = points.reduce(
      (acc, p) => ({ posts: acc.posts + p.posts, signups: acc.signups + p.signups }),
      { posts: 0, signups: 0 },
    );
    expect(totals).toEqual({ posts: 2, signups: 1 });
    // Chronological order
    const sorted = [...points].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    expect(points).toEqual(sorted);
  });

  it('returns 8 zeroed buckets on an empty DB', async () => {
    const points = await getLinkedInROI();
    expect(points).toHaveLength(8);
    for (const p of points) {
      expect(p.posts).toBe(0);
      expect(p.signups).toBe(0);
      expect(p.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
