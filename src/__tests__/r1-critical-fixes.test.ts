/**
 * R1 Critical fixes tests.
 * Tests written BEFORE implementation per TDD.
 */

import { forbiddenResponse } from '@/lib/admin/auth';
import { getArticles } from '@/lib/admin/threat-intel-service';

// ─── C2: forbiddenResponse must return a new instance each call ───────────────

describe('forbiddenResponse — fresh instance per call', () => {
  it('returns a NextResponse with 403', () => {
    const r = forbiddenResponse();
    expect(r.status).toBe(403);
  });

  it('returns a NEW object on each call (no shared reference)', () => {
    const r1 = forbiddenResponse();
    const r2 = forbiddenResponse();
    expect(r1).not.toBe(r2);
  });
});

// ─── C3: threat-intel pagination with domain/industry filters ────────────────

const mockFindMany = jest.fn();
const mockCount = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    threatIntel: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      count: (...a: unknown[]) => mockCount(...a),
    },
  },
}));

beforeEach(() => jest.clearAllMocks());

describe('getArticles — pagination with domain/industry filters in DB', () => {
  it('passes domain filter inside DB where clause, not post-fetch', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getArticles({ domains: ['CPP-01'] });

    // The where clause passed to findMany must include domain filter
    const whereArg = mockFindMany.mock.calls[0][0].where;
    expect(JSON.stringify(whereArg)).toContain('CPP-01');
  });

  it('passes industry filter inside DB where clause', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getArticles({ industries: ['banking'] });

    const whereArg = mockFindMany.mock.calls[0][0].where;
    expect(JSON.stringify(whereArg)).toContain('banking');
  });

  it('total count reflects filtered results, not all rows', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'ti-1', domainTags: ['CPP-01'], industryTags: [], title: 'T1', source: 's' },
    ]);
    mockCount.mockResolvedValue(1);

    const result = await getArticles({ domains: ['CPP-01'] });
    // total from DB must equal filtered count (both queries use same where)
    expect(result.total).toBe(result.articles.length);
  });
});
