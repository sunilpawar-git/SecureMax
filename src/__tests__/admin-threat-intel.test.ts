/**
 * Tests for threat intel service — filtering, manual add, delete protection.
 */

import {
  getArticles,
  addManualArticle,
  deleteArticle,
  restoreArticle,
} from '@/lib/admin/threat-intel-service';
import { ADMIN_ACTION_TYPE, ADMIN_ERR } from '@/config/admin-strings';

const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockAdminCreate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    threatIntel: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      count: (...a: unknown[]) => mockCount(...a),
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      create: (...a: unknown[]) => mockCreate(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
    adminAction: { create: (...a: unknown[]) => mockAdminCreate(...a) },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAdminCreate.mockResolvedValue({ id: 'action-1' });
});

describe('getArticles', () => {
  it('returns articles with pagination', async () => {
    mockFindMany.mockResolvedValue([{ id: 'a1', domainTags: ['CPP-01'], industryTags: [] }]);
    mockCount.mockResolvedValue(1);

    const result = await getArticles({ page: 1, limit: 10 });
    expect(result.articles).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('filters by search in title', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getArticles({ search: 'breach' });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          title: expect.objectContaining({ contains: 'breach' }),
        }),
      }),
    );
  });

  it('filters by source', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getArticles({ source: 'manual' });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ source: 'manual' }),
      }),
    );
  });

  it('filters by date range', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getArticles({ startDate: '2026-01-01T00:00:00Z', endDate: '2026-12-31T23:59:59Z' });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          scrapedAt: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
        }),
      }),
    );
  });

  it('passes domain filter inside DB where clause (not in-memory)', async () => {
    mockFindMany.mockResolvedValue([{ id: 'a1', domainTags: ['CPP-01'], industryTags: [] }]);
    mockCount.mockResolvedValue(1);

    const result = await getArticles({ domains: ['CPP-01'] });

    // Filter must be in DB where clause, not post-fetch
    const whereArg = mockFindMany.mock.calls[0][0].where;
    expect(JSON.stringify(whereArg)).toContain('CPP-01');
    // total and articles.length must be consistent (both from same filtered query)
    expect(result.total).toBe(result.articles.length);
  });

  it('passes industry filter inside DB where clause (not in-memory)', async () => {
    mockFindMany.mockResolvedValue([{ id: 'a1', domainTags: [], industryTags: ['warehouse'] }]);
    mockCount.mockResolvedValue(1);

    const result = await getArticles({ industries: ['warehouse'] });

    const whereArg = mockFindMany.mock.calls[0][0].where;
    expect(JSON.stringify(whereArg)).toContain('warehouse');
    expect(result.total).toBe(result.articles.length);
  });

  it('excludes soft-deleted articles by default (regression guard)', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getArticles();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ softDeleted: false }),
      }),
    );
  });

  it('includes soft-deleted articles when showDeleted is true', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getArticles({ showDeleted: true });

    const whereArg = mockFindMany.mock.calls[0][0].where;
    expect(whereArg.softDeleted).toBeUndefined();
  });
});

describe('addManualArticle', () => {
  const validData = {
    title: 'New Article',
    url: 'https://example.com/new',
    summary: 'A new security article.',
    domainTags: ['CPP-01'],
    industryTags: ['warehouse'],
  };

  it('creates article with source=manual and logs action', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'a-new', ...validData });

    const result = await addManualArticle(validData, 'admin-1');

    expect(result.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ source: 'manual' }),
      }),
    );
    expect(mockAdminCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: ADMIN_ACTION_TYPE.THREAT_INTEL_ADDED,
        }),
      }),
    );
  });

  it('rejects duplicate URL', async () => {
    mockFindUnique.mockResolvedValue({ id: 'existing', url: validData.url });

    const result = await addManualArticle(validData, 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe(ADMIN_ERR.DUPLICATE_URL);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('deleteArticle', () => {
  it('soft-deletes when not used in reports', async () => {
    mockFindUnique.mockResolvedValue({ id: 'a1', usedInReports: false });
    mockUpdate.mockResolvedValue({});

    const result = await deleteArticle('a1', 'admin-1');
    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { softDeleted: true },
      }),
    );
    expect(mockAdminCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: ADMIN_ACTION_TYPE.THREAT_INTEL_DELETED,
        }),
      }),
    );
  });

  it('blocks deletion when used in reports', async () => {
    mockFindUnique.mockResolvedValue({ id: 'a1', usedInReports: true });

    const result = await deleteArticle('a1', 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe(ADMIN_ERR.THREAT_INTEL_PROTECTED);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns error for non-existent article', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await deleteArticle('bad-id', 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe(ADMIN_ERR.THREAT_INTEL_NOT_FOUND);
  });
});

describe('restoreArticle', () => {
  it('sets softDeleted back to false and logs the action', async () => {
    mockFindUnique.mockResolvedValue({ id: 'a1', softDeleted: true });
    mockUpdate.mockResolvedValue({});

    const result = await restoreArticle('a1', 'admin-1');
    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'a1' },
        data: { softDeleted: false },
      }),
    );
    expect(mockAdminCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: ADMIN_ACTION_TYPE.THREAT_INTEL_RESTORED,
        }),
      }),
    );
  });

  it('returns error for non-existent article', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await restoreArticle('bad-id', 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe(ADMIN_ERR.THREAT_INTEL_NOT_FOUND);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
