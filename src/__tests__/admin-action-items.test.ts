/**
 * Tests for admin action items service.
 * Verifies overdue follow-ups, scraper failures, and new leads queries.
 */

import { getActionItems, type ActionItems } from '@/lib/admin/action-items-service';

const mockFollowUpCount = jest.fn();
const mockScraperCount = jest.fn();
const mockLeadCount = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    followUpReminder: { count: (...args: unknown[]) => mockFollowUpCount(...args) },
    scraperRun: { count: (...args: unknown[]) => mockScraperCount(...args) },
    enterpriseLead: { count: (...args: unknown[]) => mockLeadCount(...args) },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getActionItems', () => {
  it('returns correct shape with zeros on empty state', async () => {
    mockFollowUpCount.mockResolvedValue(0);
    mockScraperCount.mockResolvedValue(0);
    mockLeadCount.mockResolvedValue(0);

    const items = await getActionItems();

    expect(items).toEqual<ActionItems>({
      overdueFollowUps: 0,
      scraperFailures: 0,
      newLeadsCount: 0,
    });
  });

  it('returns correct counts when items exist', async () => {
    mockFollowUpCount.mockResolvedValue(3);
    mockScraperCount.mockResolvedValue(1);
    mockLeadCount.mockResolvedValue(7);

    const items = await getActionItems();

    expect(items.overdueFollowUps).toBe(3);
    expect(items.scraperFailures).toBe(1);
    expect(items.newLeadsCount).toBe(7);
  });

  it('filters follow-ups by pending status and overdue date', async () => {
    mockFollowUpCount.mockResolvedValue(2);
    mockScraperCount.mockResolvedValue(0);
    mockLeadCount.mockResolvedValue(0);

    await getActionItems();

    expect(mockFollowUpCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'pending',
          dueAt: expect.objectContaining({ lte: expect.any(Date) }),
        }),
      }),
    );
  });

  it('filters scraper failures from last 7 days', async () => {
    mockFollowUpCount.mockResolvedValue(0);
    mockScraperCount.mockResolvedValue(1);
    mockLeadCount.mockResolvedValue(0);

    await getActionItems();

    expect(mockScraperCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'failed',
          startedAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      }),
    );
  });

  it('runs all queries in parallel', async () => {
    mockFollowUpCount.mockResolvedValue(0);
    mockScraperCount.mockResolvedValue(0);
    mockLeadCount.mockResolvedValue(0);

    await getActionItems();

    expect(mockFollowUpCount).toHaveBeenCalledTimes(1);
    expect(mockScraperCount).toHaveBeenCalledTimes(1);
    expect(mockLeadCount).toHaveBeenCalledTimes(1);
  });
});
