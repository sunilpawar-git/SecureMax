/**
 * Tests for audit log service + CSV export with PII masking.
 */

import { getAuditLog } from '@/lib/admin/audit-service';
import { maskEmail, auditLogToCsv } from '@/lib/admin/csv-export';
import type { AuditLogEntry } from '@/lib/admin/audit-service';

const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockUserFindMany = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    adminAction: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      count: (...a: unknown[]) => mockCount(...a),
    },
    user: {
      findMany: (...a: unknown[]) => mockUserFindMany(...a),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUserFindMany.mockResolvedValue([{ id: 'adm-1', email: 'admin@raivanglobal.com' }]);
});

const NOW = new Date();
const SAMPLE_ACTION = {
  id: 'act-1',
  adminId: 'adm-1',
  actionType: 'lead_status_changed',
  entityType: 'lead',
  entityId: 'lead-1',
  metadata: null,
  createdAt: NOW,
};

describe('getAuditLog', () => {
  it('returns entries ordered by createdAt desc', async () => {
    mockFindMany.mockResolvedValue([SAMPLE_ACTION]);
    mockCount.mockResolvedValue(1);

    const result = await getAuditLog();
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].actionType).toBe('lead_status_changed');
    expect(result.total).toBe(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });

  it('filters by date range', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getAuditLog({ startDate: '2026-01-01T00:00:00Z', endDate: '2026-12-31T23:59:59Z' });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });

  it('filters by actionType', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getAuditLog({ actionType: 'session_killed' });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ actionType: 'session_killed' }),
      }),
    );
  });

  it('paginates correctly', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(120);

    const result = await getAuditLog({ page: 3, limit: 20 });

    expect(result.page).toBe(3);
    expect(result.limit).toBe(20);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 }),
    );
  });
});

describe('maskEmail', () => {
  it('masks email showing first 3 chars + domain', () => {
    expect(maskEmail('john@example.com')).toBe('joh***@example.com');
  });

  it('handles short local parts', () => {
    expect(maskEmail('ab@test.com')).toBe('ab***@test.com');
  });

  it('returns dash for null', () => {
    expect(maskEmail(null)).toBe('—');
  });

  it('returns masked for no @ symbol', () => {
    expect(maskEmail('invalid')).toBe('***');
  });
});

describe('auditLogToCsv', () => {
  const entry: AuditLogEntry = {
    id: 'act-1',
    adminId: 'adm-1',
    actionType: 'lead_status_changed',
    entityType: 'lead',
    entityId: 'lead-1',
    metadata: null,
    createdAt: '2026-05-14T10:00:00.000Z',
    adminEmail: 'admin@raivanglobal.com',
  };

  it('generates CSV with correct headers', () => {
    const csv = auditLogToCsv([entry]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('ID,Admin,Action,Entity Type,Entity ID,Timestamp');
  });

  it('masks email in CSV output', () => {
    const csv = auditLogToCsv([entry]);
    expect(csv).toContain('adm***@raivanglobal.com');
    expect(csv).not.toContain('admin@raivanglobal.com');
  });

  it('handles entries with commas in fields', () => {
    const entryWithComma = { ...entry, entityId: 'lead,with,commas' };
    const csv = auditLogToCsv([entryWithComma]);
    expect(csv).toContain('"lead,with,commas"');
  });

  it('returns only headers for empty array', () => {
    const csv = auditLogToCsv([]);
    expect(csv).toBe('ID,Admin,Action,Entity Type,Entity ID,Timestamp');
  });
});
