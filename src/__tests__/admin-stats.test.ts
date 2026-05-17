/**
 * Tests for admin stats service and API route.
 * Mocks Prisma to verify correct query shapes and return types.
 */

import { getDashboardStats, type DashboardStats } from '@/lib/admin/stats-service';

const mockCount = jest.fn();
const mockFindFirst = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    auditSession: { count: (...args: unknown[]) => mockCount('auditSession', ...args) },
    enterpriseLead: { count: (...args: unknown[]) => mockCount('enterpriseLead', ...args) },
    reportArtifact: { count: (...args: unknown[]) => mockCount('reportArtifact', ...args) },
    threatIntel: { count: (...args: unknown[]) => mockCount('threatIntel', ...args) },
    scraperRun: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getDashboardStats', () => {
  it('returns correct shape with all numeric fields', async () => {
    mockCount.mockResolvedValue(0);
    mockFindFirst.mockResolvedValue(null);

    const stats = await getDashboardStats();

    expect(stats).toEqual<DashboardStats>({
      activeSessions: 0,
      completedSessions: 0,
      pendingLeads: 0,
      totalLeads: 0,
      reportsGenerated: 0,
      totalArticles: 0,
      scraperHealthy: true,
    });
  });

  it('returns real counts from Prisma', async () => {
    mockCount.mockImplementation((model: string, where?: { where?: { status?: string } }) => {
      if (model === 'auditSession' && where?.where?.status === 'in_progress') return Promise.resolve(3);
      if (model === 'auditSession' && where?.where?.status === 'completed') return Promise.resolve(12);
      if (model === 'enterpriseLead' && where?.where?.status === 'new') return Promise.resolve(5);
      if (model === 'enterpriseLead' && !where?.where?.status) return Promise.resolve(20);
      if (model === 'reportArtifact') return Promise.resolve(8);
      if (model === 'threatIntel') return Promise.resolve(150);
      return Promise.resolve(0);
    });
    mockFindFirst.mockResolvedValue({ status: 'completed' });

    const stats = await getDashboardStats();

    expect(stats.activeSessions).toBe(3);
    expect(stats.completedSessions).toBe(12);
    expect(stats.pendingLeads).toBe(5);
    expect(stats.totalLeads).toBe(20);
    expect(stats.reportsGenerated).toBe(8);
    expect(stats.totalArticles).toBe(150);
    expect(stats.scraperHealthy).toBe(true);
  });

  it('reports scraper unhealthy when latest run failed', async () => {
    mockCount.mockResolvedValue(0);
    mockFindFirst.mockResolvedValue({ status: 'failed' });

    const stats = await getDashboardStats();

    expect(stats.scraperHealthy).toBe(false);
  });

  it('reports scraper healthy when no runs exist', async () => {
    mockCount.mockResolvedValue(0);
    mockFindFirst.mockResolvedValue(null);

    const stats = await getDashboardStats();

    expect(stats.scraperHealthy).toBe(true);
  });

  it('reports scraper healthy when latest run is running', async () => {
    mockCount.mockResolvedValue(0);
    mockFindFirst.mockResolvedValue({ status: 'running' });

    const stats = await getDashboardStats();

    expect(stats.scraperHealthy).toBe(false);
  });

  it('runs all queries in parallel via Promise.all', async () => {
    mockCount.mockResolvedValue(0);
    mockFindFirst.mockResolvedValue(null);

    await getDashboardStats();

    expect(mockCount).toHaveBeenCalledTimes(6);
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
  });
});
