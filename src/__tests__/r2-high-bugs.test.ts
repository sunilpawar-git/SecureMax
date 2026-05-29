/**
 * R2 High-severity bug tests.
 */

import { safeInt } from '@/lib/utils';
import { ADMIN_ERR } from '@/config/admin-strings';
import { SESSION_STATUS } from '@/config/strings';

// ─── H1: safeInt helper ───────────────────────────────────────────────────────

describe('safeInt — NaN guard', () => {
  it('parses a valid integer string', () => {
    expect(safeInt('5', 1)).toBe(5);
  });
  it('returns fallback for NaN', () => {
    expect(safeInt('abc', 1)).toBe(1);
  });
  it('returns fallback for undefined', () => {
    expect(safeInt(undefined, 1)).toBe(1);
  });
  it('returns fallback for null', () => {
    expect(safeInt(null, 1)).toBe(1);
  });
  it('returns fallback for empty string', () => {
    expect(safeInt('', 10)).toBe(10);
  });
});

// ─── H4/H5: SSOT magic strings replaced ──────────────────────────────────────

describe('SSOT constants used for status values', () => {
  it('SESSION_STATUS.IN_PROGRESS is in_progress', () => {
    expect(SESSION_STATUS.IN_PROGRESS).toBe('in_progress');
  });
  it('ADMIN_ERR.LEAD_NO_EMAIL is defined', () => {
    expect(ADMIN_ERR.LEAD_NO_EMAIL).toBeDefined();
  });
  it('ADMIN_ERR.REPORT_REGEN_FAILED is defined', () => {
    expect(ADMIN_ERR.REPORT_REGEN_FAILED).toBeDefined();
  });
});

// ─── H8: Integration test — proposal_sent side effect (sourceSessionId) ───────

const mockPrisma = {
  enterpriseLead: { findUnique: jest.fn(), update: jest.fn() },
  followUpReminder: { create: jest.fn() },
  auditSession: { findUnique: jest.fn(), update: jest.fn() },
  adminAction: { create: jest.fn() },
};
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/admin/email', () => ({
  sendLeadEmail: jest.fn().mockResolvedValue({ success: true }),
}));

import { updateLeadStatus } from '@/lib/admin/leads-service';
import { LEAD_STATUS } from '@/config/admin-strings';

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.adminAction.create.mockResolvedValue({ id: 'act-1' });
  mockPrisma.followUpReminder.create.mockResolvedValue({ id: 'fr-1' });
});

describe('updateLeadStatus — proposal_sent side effects (sourceSessionId field)', () => {
  it('does NOT set paid:true on proposal_sent — payment is confirmed separately', async () => {
    const lead = {
      id: 'l-1',
      status: LEAD_STATUS.CONTACTED,
      email: 'lead@acme.com',
      sourceSessionId: 'sess-abc',
    };
    mockPrisma.enterpriseLead.findUnique.mockResolvedValue(lead);
    mockPrisma.enterpriseLead.update.mockResolvedValue({
      ...lead,
      status: LEAD_STATUS.PROPOSAL_SENT,
    });
    mockPrisma.auditSession.update.mockResolvedValue({});

    await updateLeadStatus('l-1', LEAD_STATUS.PROPOSAL_SENT, 'admin-1');

    // CRM status must not trigger payment unlock. Unlock is via admin report unlock action.
    expect(mockPrisma.auditSession.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: { paid: true } }),
    );
  });

  it('skips session unlock when sourceSessionId is null', async () => {
    const lead = {
      id: 'l-2',
      status: LEAD_STATUS.CONTACTED,
      email: 'lead@acme.com',
      sourceSessionId: null,
    };
    mockPrisma.enterpriseLead.findUnique.mockResolvedValue(lead);
    mockPrisma.enterpriseLead.update.mockResolvedValue({
      ...lead,
      status: LEAD_STATUS.PROPOSAL_SENT,
    });

    await updateLeadStatus('l-2', LEAD_STATUS.PROPOSAL_SENT, 'admin-1');

    expect(mockPrisma.auditSession.update).not.toHaveBeenCalled();
  });
});
