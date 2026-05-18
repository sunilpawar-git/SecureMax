/**
 * Tests for admin sessions service — list, filter, force-close.
 */

import { getSessions, forceCloseSession } from '@/lib/admin/sessions-service';
import { ADMIN_ACTION_TYPE, ADMIN_ERR } from '@/config/admin-strings';
import { SESSION_STATUS } from '@/config/strings';

const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockAdminCreate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    auditSession: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      count: (...a: unknown[]) => mockCount(...a),
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
    adminAction: { create: (...a: unknown[]) => mockAdminCreate(...a) },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAdminCreate.mockResolvedValue({ id: 'action-1' });
});

describe('getSessions', () => {
  it('returns sessions with user info and pagination', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'sess-1',
        track: 'hni',
        status: 'in_progress',
        paid: false,
        reportReady: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { email: 'user@test.com', name: 'Test User' },
      },
    ]);
    mockCount.mockResolvedValue(1);

    const result = await getSessions();
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].userEmail).toBe('user@test.com');
    expect(result.total).toBe(1);
  });

  it('filters by status', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getSessions({ status: 'in_progress' });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'in_progress' }),
      }),
    );
  });

  it('filters by track', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getSessions({ track: 'enterprise' });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ track: 'enterprise' }),
      }),
    );
  });
});

describe('forceCloseSession', () => {
  it('sets status to abandoned and logs action', async () => {
    mockFindUnique.mockResolvedValue({ id: 'sess-1', status: 'in_progress' });
    mockUpdate.mockResolvedValue({});

    const result = await forceCloseSession('sess-1', 'admin-1');
    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: SESSION_STATUS.ABANDONED },
      }),
    );
    expect(mockAdminCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: ADMIN_ACTION_TYPE.SESSION_KILLED,
        }),
      }),
    );
  });

  it('rejects force-close on already abandoned session', async () => {
    mockFindUnique.mockResolvedValue({ id: 'sess-1', status: 'abandoned' });

    const result = await forceCloseSession('sess-1', 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe(ADMIN_ERR.SESSION_ALREADY_CLOSED);
  });

  it('rejects force-close on completed session', async () => {
    mockFindUnique.mockResolvedValue({ id: 'sess-1', status: 'completed' });

    const result = await forceCloseSession('sess-1', 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe(ADMIN_ERR.SESSION_ALREADY_CLOSED);
  });

  it('returns error for non-existent session', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await forceCloseSession('bad-id', 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe(ADMIN_ERR.SESSION_NOT_FOUND);
  });
});
