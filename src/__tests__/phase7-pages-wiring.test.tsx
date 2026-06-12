/**
 * @jest-environment jsdom
 *
 * Phase 7 tests — un-surfaced pages wired into the flows.
 * Intent: the admin Reports table labels free vs paid access and does NOT
 * link to the owner-scoped user checklist (admins are rejected by the API —
 * tracked as a P4 stub); enterprise LeadCards link to the proposal page
 * for leads with a completed session; the free summary page nudges HNI users
 * with the actual unlock price.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { render, screen } from '@testing-library/react';
import { ReportsTable } from '@/app/admin/reports/_components/ReportsTable';
import { LeadCard } from '@/app/admin/leads/_components/LeadCard';
import { REPORTS_TABLE, LEAD_CARD_STRINGS } from '@/config/admin-strings';
import type { ReportEntry } from '@/app/admin/reports/_hooks/useReportsData';
import type { Lead } from '@/app/admin/leads/_hooks/useLeadsData';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ sessionId: 'sess-1' }),
  useSearchParams: () => new URLSearchParams(),
}));

function makeReport(overrides: Partial<ReportEntry> = {}): ReportEntry {
  return {
    id: 'rep-1',
    sessionId: 'sess-abc12345',
    version: 1,
    previousId: null,
    track: 'hni',
    sessionStatus: 'completed',
    paid: false,
    unlocked: false,
    userEmail: 'user@example.com',
    urgencyScore: 72,
    gapCount: 3,
    generatedAt: '2026-06-01T10:00:00Z',
    ...overrides,
  };
}

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    company: 'Acme Corp',
    name: 'Jane Doe',
    email: 'jane@acme.com',
    preferredContact: null,
    facilitiesCount: 3,
    status: 'new',
    sourceSessionId: null,
    followUpDueAt: null,
    lastEmailSentAt: null,
    createdAt: '2026-06-01T10:00:00Z',
    couponCode: null,
    sessionPaid: null,
    ...overrides,
  } as Lead;
}

const noop = jest.fn();

describe('ReportsTable — access labels and no broken checklist link', () => {
  it('does not link to the owner-scoped user checklist (P4 stub)', () => {
    render(
      <ReportsTable
        reports={[makeReport()]}
        onRegenerate={noop}
        onUnlock={noop}
        onViewDiff={noop}
      />,
    );
    // The /checklist/[sessionId] route rejects non-owners and progress is
    // localStorage-bound — an admin link would always show a broken page.
    const links = screen.queryAllByRole('link');
    expect(links.filter((l) => l.getAttribute('href')?.startsWith('/checklist/'))).toHaveLength(0);
  });

  it('labels unpaid reports as free view and paid reports as paid download', () => {
    render(
      <ReportsTable
        reports={[
          makeReport({ id: 'rep-free', sessionId: 'sess-free' }),
          makeReport({ id: 'rep-paid', sessionId: 'sess-paid', paid: true }),
        ]}
        onRegenerate={noop}
        onUnlock={noop}
        onViewDiff={noop}
      />,
    );
    expect(screen.getByText(REPORTS_TABLE.ACCESS_FREE)).toBeInTheDocument();
    expect(screen.getByText(REPORTS_TABLE.ACCESS_PAID)).toBeInTheDocument();
  });
});

describe('LeadCard — View Proposal link', () => {
  it('links to the proposal page when the lead has a completed session', () => {
    render(
      <LeadCard
        lead={makeLead({ sourceSessionId: 'sess-ent-1' })}
        onStatusChange={noop}
        onEmail={noop}
      />,
    );
    const link = screen.getByRole('link', { name: LEAD_CARD_STRINGS.VIEW_PROPOSAL });
    expect(link).toHaveAttribute('href', '/enterprise/proposal?session=sess-ent-1');
  });

  it('hides the link for leads without a source session', () => {
    render(<LeadCard lead={makeLead()} onStatusChange={noop} onEmail={noop} />);
    expect(
      screen.queryByRole('link', { name: LEAD_CARD_STRINGS.VIEW_PROPOSAL }),
    ).not.toBeInTheDocument();
  });
});

describe('Summary page — conversion nudge with price', () => {
  const mockFetch = jest.fn();
  global.fetch = mockFetch as any;

  it('shows the unlock nudge with the rupee price for HNI reports', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        domain_scores: {},
        findings: [],
        urgency_score: 70,
        track: 'hni',
        session_id: 'sess-1',
      }),
    });
    const { default: ReportSummaryPage } =
      await import('@/app/(app)/report/[sessionId]/summary/page');
    render(<ReportSummaryPage />);

    expect(await screen.findByText(/unlock for \u20B94,999/)).toBeInTheDocument();
  });
});
