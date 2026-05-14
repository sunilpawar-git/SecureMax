/**
 * Tests for admin global search service — cross-entity parallel queries.
 */

import { globalSearch, type SearchResults } from '@/lib/admin/search-service';

const mockUserFind = jest.fn();
const mockSessionFind = jest.fn();
const mockLeadFind = jest.fn();
const mockThreatFind = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findMany: (...a: unknown[]) => mockUserFind(...a) },
    auditSession: { findMany: (...a: unknown[]) => mockSessionFind(...a) },
    enterpriseLead: { findMany: (...a: unknown[]) => mockLeadFind(...a) },
    threatIntel: { findMany: (...a: unknown[]) => mockThreatFind(...a) },
  },
}));

beforeEach(() => jest.clearAllMocks());

describe('globalSearch', () => {
  it('returns correct shape with all entity types', async () => {
    mockUserFind.mockResolvedValue([{ id: 'u1', email: 'acme@test.com', name: 'Acme' }]);
    mockSessionFind.mockResolvedValue([]);
    mockLeadFind.mockResolvedValue([{ id: 'l1', company: 'Acme Corp', name: 'John', status: 'new' }]);
    mockThreatFind.mockResolvedValue([]);

    const result = await globalSearch('acme');

    expect(result).toHaveProperty('users');
    expect(result).toHaveProperty('sessions');
    expect(result).toHaveProperty('leads');
    expect(result).toHaveProperty('threatIntel');
    expect(result.users).toHaveLength(1);
    expect(result.leads).toHaveLength(1);
  });

  it('searches users by email', async () => {
    mockUserFind.mockResolvedValue([]);
    mockSessionFind.mockResolvedValue([]);
    mockLeadFind.mockResolvedValue([]);
    mockThreatFind.mockResolvedValue([]);

    await globalSearch('john@');

    expect(mockUserFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ email: expect.objectContaining({ contains: 'john@' }) }),
          ]),
        }),
      }),
    );
  });

  it('searches leads by company name', async () => {
    mockUserFind.mockResolvedValue([]);
    mockSessionFind.mockResolvedValue([]);
    mockLeadFind.mockResolvedValue([]);
    mockThreatFind.mockResolvedValue([]);

    await globalSearch('acme');

    expect(mockLeadFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ company: expect.objectContaining({ contains: 'acme' }) }),
          ]),
        }),
      }),
    );
  });

  it('searches sessions by ID prefix', async () => {
    mockUserFind.mockResolvedValue([]);
    mockSessionFind.mockResolvedValue([]);
    mockLeadFind.mockResolvedValue([]);
    mockThreatFind.mockResolvedValue([]);

    await globalSearch('clx');

    expect(mockSessionFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ id: expect.objectContaining({ startsWith: 'clx' }) }),
          ]),
        }),
      }),
    );
  });

  it('searches threat intel by title', async () => {
    mockUserFind.mockResolvedValue([]);
    mockSessionFind.mockResolvedValue([]);
    mockLeadFind.mockResolvedValue([]);
    mockThreatFind.mockResolvedValue([]);

    await globalSearch('breach');

    expect(mockThreatFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          title: expect.objectContaining({ contains: 'breach' }),
        }),
      }),
    );
  });

  it('caps results per entity type at 5', async () => {
    mockUserFind.mockResolvedValue([]);
    mockSessionFind.mockResolvedValue([]);
    mockLeadFind.mockResolvedValue([]);
    mockThreatFind.mockResolvedValue([]);

    await globalSearch('test');

    expect(mockUserFind).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    expect(mockSessionFind).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    expect(mockLeadFind).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    expect(mockThreatFind).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
  });

  it('returns empty results when nothing matches', async () => {
    mockUserFind.mockResolvedValue([]);
    mockSessionFind.mockResolvedValue([]);
    mockLeadFind.mockResolvedValue([]);
    mockThreatFind.mockResolvedValue([]);

    const result = await globalSearch('zzzzzzzzz');
    expect(result.users).toEqual([]);
    expect(result.sessions).toEqual([]);
    expect(result.leads).toEqual([]);
    expect(result.threatIntel).toEqual([]);
  });

  it('runs all queries in parallel', async () => {
    mockUserFind.mockResolvedValue([]);
    mockSessionFind.mockResolvedValue([]);
    mockLeadFind.mockResolvedValue([]);
    mockThreatFind.mockResolvedValue([]);

    await globalSearch('x');

    expect(mockUserFind).toHaveBeenCalledTimes(1);
    expect(mockSessionFind).toHaveBeenCalledTimes(1);
    expect(mockLeadFind).toHaveBeenCalledTimes(1);
    expect(mockThreatFind).toHaveBeenCalledTimes(1);
  });
});
