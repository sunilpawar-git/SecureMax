/**
 * @jest-environment jsdom
 *
 * Phase 4 tests — admin efficiency wins.
 * 4A: dashboard auto-refreshes every 5 min silently (no loading flicker).
 * 4C: sessions service/API accept a userId filter.
 * 4D: markLeadSessionPaid unlocks the linked session with audit logging.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { renderHook, act, waitFor } from '@testing-library/react';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('userId=user-42'),
}));

const mockPrisma = {
  auditSession: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  enterpriseLead: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  adminAction: { create: jest.fn() },
  couponCode: { create: jest.fn() },
  followUpReminder: { create: jest.fn() },
};
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/admin/email', () => ({
  sendLeadEmail: jest.fn().mockResolvedValue({ success: true }),
}));

import { useDashboardData, DASHBOARD_AUTO_REFRESH_MS } from '@/app/admin/_hooks/useDashboardData';
import { useSessionsData } from '@/app/admin/sessions/_hooks/useSessionsData';
import { getSessions } from '@/lib/admin/sessions-service';
import { markLeadSessionPaid } from '@/lib/admin/leads-service';
import { MARK_PAID_STRINGS, ADMIN_ERR } from '@/config/admin-strings';

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.adminAction.create.mockResolvedValue({ id: 'act-1' });
});

describe('4A: dashboard auto-refresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('refresh cadence is 5 minutes', () => {
    expect(DASHBOARD_AUTO_REFRESH_MS).toBe(300_000);
  });

  it('fires a silent refetch after the interval elapses', async () => {
    const { unmount } = renderHook(() => useDashboardData());

    // Initial load: 3 endpoints
    await act(async () => {
      await Promise.resolve();
    });
    const initialCalls = mockFetch.mock.calls.length;
    expect(initialCalls).toBe(3);

    await act(async () => {
      jest.advanceTimersByTime(DASHBOARD_AUTO_REFRESH_MS);
    });
    expect(mockFetch.mock.calls.length).toBe(initialCalls + 3);

    unmount();
  });

  it('silent refresh does not flip loading back to true', async () => {
    const { result, unmount } = renderHook(() => useDashboardData());
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.loading).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(DASHBOARD_AUTO_REFRESH_MS);
    });
    expect(result.current.loading).toBe(false);
    unmount();
  });

  it('stops refreshing after unmount', async () => {
    const { unmount } = renderHook(() => useDashboardData());
    await act(async () => {
      await Promise.resolve();
    });
    unmount();

    const callsAtUnmount = mockFetch.mock.calls.length;
    act(() => {
      jest.advanceTimersByTime(DASHBOARD_AUTO_REFRESH_MS * 3);
    });
    expect(mockFetch.mock.calls.length).toBe(callsAtUnmount);
  });
});

describe('4C: sessions userId filter', () => {
  it('getSessions passes userId into the Prisma where clause', async () => {
    mockPrisma.auditSession.findMany.mockResolvedValue([]);
    mockPrisma.auditSession.count.mockResolvedValue(0);

    await getSessions({ userId: 'user-42' });

    expect(mockPrisma.auditSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-42' } }),
    );
  });

  it('useSessionsData seeds the userId filter from ?userId= and sends it to the API', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ sessions: [], total: 0 }),
    });

    const { result, unmount } = renderHook(() => useSessionsData());
    expect(result.current.userIdFilter).toBe('user-42');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('userId=user-42'));
    });
    unmount();
  });
});

describe('4D: markLeadSessionPaid', () => {
  const lead = { id: 'l-1', company: 'Acme', sourceSessionId: 'sess-1' };

  it('marks the linked session paid + unlocks enterprise report + logs audit', async () => {
    mockPrisma.enterpriseLead.findUnique.mockResolvedValue(lead);
    mockPrisma.auditSession.findUnique.mockResolvedValue({ id: 'sess-1', paid: false });
    mockPrisma.auditSession.update.mockResolvedValue({});

    const result = await markLeadSessionPaid('l-1', 'admin-1', 'INV-2026-041');
    expect(result.success).toBe(true);
    expect(mockPrisma.auditSession.update).toHaveBeenCalledWith({
      where: { id: 'sess-1' },
      data: { paid: true, enterpriseReportUnlocked: true },
    });
    expect(mockPrisma.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: 'lead_marked_paid',
          metadata: expect.objectContaining({ invoiceRef: 'INV-2026-041' }),
        }),
      }),
    );
  });

  it('sanitizes the invoice ref (strips angle brackets)', async () => {
    mockPrisma.enterpriseLead.findUnique.mockResolvedValue(lead);
    mockPrisma.auditSession.findUnique.mockResolvedValue({ id: 'sess-1', paid: false });
    mockPrisma.auditSession.update.mockResolvedValue({});

    await markLeadSessionPaid('l-1', 'admin-1', '<script>INV-1</script>');
    expect(mockPrisma.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({ invoiceRef: 'scriptINV-1/script' }),
        }),
      }),
    );
  });

  it('fails when the lead has no linked session', async () => {
    mockPrisma.enterpriseLead.findUnique.mockResolvedValue({ ...lead, sourceSessionId: null });
    const result = await markLeadSessionPaid('l-1', 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe(MARK_PAID_STRINGS.ERR_NO_SESSION);
    expect(mockPrisma.auditSession.update).not.toHaveBeenCalled();
  });

  it('fails when the session is already paid', async () => {
    mockPrisma.enterpriseLead.findUnique.mockResolvedValue(lead);
    mockPrisma.auditSession.findUnique.mockResolvedValue({ id: 'sess-1', paid: true });
    const result = await markLeadSessionPaid('l-1', 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe(MARK_PAID_STRINGS.ERR_ALREADY_PAID);
    expect(mockPrisma.auditSession.update).not.toHaveBeenCalled();
  });

  it('fails for an unknown lead', async () => {
    mockPrisma.enterpriseLead.findUnique.mockResolvedValue(null);
    const result = await markLeadSessionPaid('nope', 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe(ADMIN_ERR.LEAD_NOT_FOUND);
  });
});
