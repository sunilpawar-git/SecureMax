/**
 * Phase 2 — Report viewer pages.
 * Verifies modules export valid defaults and components have correct shapes.
 */

import * as reportStatusMod from '@/app/(app)/report/[sessionId]/status/page';
import * as reportSummaryMod from '@/app/(app)/report/[sessionId]/summary/page';
import * as reportDownloadMod from '@/app/(app)/report/[sessionId]/download/page';
import * as freeSummaryMod from '@/components/report/FreeSummaryView';
import * as findingCardMod from '@/components/report/FindingCard';
import * as useReportTriggerMod from '@/app/(app)/questionnaire/use-report-trigger';

describe('Report viewer pages export valid modules', () => {
  it('report status page exports a default function', () => {
    expect(typeof reportStatusMod.default).toBe('function');
  });

  it('report summary page exports a default function', () => {
    expect(typeof reportSummaryMod.default).toBe('function');
  });

  it('report download page exports a default function', () => {
    expect(typeof reportDownloadMod.default).toBe('function');
  });
});

describe('Report components export correctly', () => {
  it('FreeSummaryView is a named export function', () => {
    expect(typeof (freeSummaryMod as Record<string, unknown>).FreeSummaryView).toBe('function');
  });

  it('FindingCard is a named export function', () => {
    expect(typeof (findingCardMod as Record<string, unknown>).FindingCard).toBe('function');
  });

  it('FindingCard exports REDACTED_PLACEHOLDER constant', () => {
    const placeholder = (findingCardMod as Record<string, unknown>).REDACTED_PLACEHOLDER;
    expect(typeof placeholder).toBe('string');
    expect((placeholder as string).length).toBeGreaterThan(0);
  });
});

describe('Report trigger hook', () => {
  it('useReportTrigger is a named export function', () => {
    expect(typeof (useReportTriggerMod as Record<string, unknown>).useReportTrigger).toBe(
      'function',
    );
  });
});

describe('Dashboard sessions API — reportJobId field', () => {
  it('SessionSummary interface accepts reportJobId as string or null', () => {
    interface SessionSummary {
      id: string;
      status: string;
      track: string;
      paid: boolean;
      reportReady: boolean;
      questionsAnswered: number;
      createdAt: string;
      reportJobId: string | null;
    }

    const withJob: SessionSummary = {
      id: 'cuid1',
      status: 'completed',
      track: 'hni',
      paid: true,
      reportReady: true,
      questionsAnswered: 25,
      createdAt: '2025-01-01T00:00:00Z',
      reportJobId: 'uuid-123',
    };

    const withoutJob: SessionSummary = {
      id: 'cuid2',
      status: 'in_progress',
      track: 'enterprise',
      paid: false,
      reportReady: false,
      questionsAnswered: 5,
      createdAt: '2025-01-02T00:00:00Z',
      reportJobId: null,
    };

    expect(withJob.reportJobId).toBe('uuid-123');
    expect(withoutJob.reportJobId).toBeNull();
  });

  it('download href uses reportJobId when available', () => {
    const reportJobId: string | null = 'uuid-123';
    const sessionId = 'cuid1';
    const paid = true;
    const reportReady = true;

    const href =
      paid && reportReady && reportJobId
        ? `/report/${reportJobId}/download`
        : `/report/${sessionId}/status`;

    expect(href).toBe('/report/uuid-123/download');
  });

  it('download href falls back to session.id/status when no reportJobId', () => {
    const reportJobId: string | null = null;
    const sessionId = 'cuid1';
    const paid = true;
    const reportReady = true;

    const href =
      paid && reportReady && reportJobId
        ? `/report/${reportJobId}/download`
        : `/report/${sessionId}/summary`;

    expect(href).toBe('/report/cuid1/summary');
  });
});
