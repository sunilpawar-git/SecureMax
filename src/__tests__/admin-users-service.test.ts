/**
 * Unit tests for admin users service — query shape, derived fields, filters, pagination.
 */

import { getUsers } from '@/lib/admin/users-service';
import type { UserFilter } from '@/lib/admin/validators';

const mockFindMany = jest.fn();
const mockCount = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      count: (...a: unknown[]) => mockCount(...a),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const BASE_DATE = new Date('2026-05-01T10:00:00Z');
const EARLIER_DATE = new Date('2026-04-01T10:00:00Z');
const LATEST_DATE = new Date('2026-05-15T10:00:00Z');

const BASE_FILTER: UserFilter = { page: 1, limit: 50 };

function makeUserRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'user@test.com',
    name: 'Test User',
    image: null,
    role: 'user',
    track: 'hni',
    createdAt: BASE_DATE,
    auditSessions: [] as { paid: boolean; updatedAt: Date }[],
    ...overrides,
  };
}

describe('getUsers', () => {
  it('returns correctly shaped UserEntry', async () => {
    mockFindMany.mockResolvedValue([makeUserRow()]);
    mockCount.mockResolvedValue(1);

    const result = await getUsers(BASE_FILTER);

    expect(result.users).toHaveLength(1);
    expect(result.users[0]).toMatchObject({
      id: 'user-1',
      email: 'user@test.com',
      name: 'Test User',
      image: null,
      role: 'user',
      track: 'hni',
      joinedAt: BASE_DATE.toISOString(),
      sessionCount: 0,
      paidSessionCount: 0,
      lastActiveAt: null,
    });
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
  });

  it('counts only paid sessions for paidSessionCount', async () => {
    mockFindMany.mockResolvedValue([
      makeUserRow({
        auditSessions: [
          { paid: true, updatedAt: BASE_DATE },
          { paid: false, updatedAt: EARLIER_DATE },
          { paid: true, updatedAt: LATEST_DATE },
        ],
      }),
    ]);
    mockCount.mockResolvedValue(1);

    const result = await getUsers(BASE_FILTER);
    expect(result.users[0].sessionCount).toBe(3);
    expect(result.users[0].paidSessionCount).toBe(2);
  });

  it('returns null lastActiveAt when user has no sessions', async () => {
    mockFindMany.mockResolvedValue([makeUserRow({ auditSessions: [] })]);
    mockCount.mockResolvedValue(1);

    const result = await getUsers(BASE_FILTER);
    expect(result.users[0].lastActiveAt).toBeNull();
  });

  it('returns the max updatedAt as lastActiveAt across multiple sessions', async () => {
    mockFindMany.mockResolvedValue([
      makeUserRow({
        auditSessions: [
          { paid: false, updatedAt: EARLIER_DATE },
          { paid: true, updatedAt: LATEST_DATE },
          { paid: false, updatedAt: BASE_DATE },
        ],
      }),
    ]);
    mockCount.mockResolvedValue(1);

    const result = await getUsers(BASE_FILTER);
    expect(result.users[0].lastActiveAt).toBe(LATEST_DATE.toISOString());
  });

  it('passes enterprise track filter to prisma where clause', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getUsers({ ...BASE_FILTER, track: 'enterprise' });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ track: 'enterprise' }),
      }),
    );
  });

  it('passes hni track filter to prisma where clause', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getUsers({ ...BASE_FILTER, track: 'hni' });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ track: 'hni' }),
      }),
    );
  });

  it('passes OR search clause for email and name (case-insensitive)', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getUsers({ ...BASE_FILTER, search: 'raivan' });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              email: expect.objectContaining({ contains: 'raivan', mode: 'insensitive' }),
            }),
            expect.objectContaining({
              name: expect.objectContaining({ contains: 'raivan', mode: 'insensitive' }),
            }),
          ]),
        }),
      }),
    );
  });

  it('applies both track and search filters simultaneously', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getUsers({ ...BASE_FILTER, track: 'hni', search: 'alice' });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          track: 'hni',
          OR: expect.arrayContaining([
            expect.objectContaining({ email: expect.objectContaining({ contains: 'alice' }) }),
          ]),
        }),
      }),
    );
  });

  it('omits OR clause when search is not provided', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getUsers(BASE_FILTER);

    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('passes correct skip and take for page 3 with limit 10', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getUsers({ page: 3, limit: 10 });

    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 10 }));
  });

  it('returns the requested page and limit in UsersResult', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const result = await getUsers({ page: 2, limit: 10 });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
  });
});
