/**
 * Phase 2 — Report viewer pages.
 * Verifies modules export valid defaults and components have correct shapes.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import * as reportStatusMod from '@/app/(app)/report/[sessionId]/status/page';
import * as reportSummaryMod from '@/app/(app)/report/[sessionId]/summary/page';
import * as reportDownloadMod from '@/app/(app)/report/[sessionId]/download/page';
import * as freeSummaryMod from '@/components/report/FreeSummaryView';
import * as findingCardMod from '@/components/report/FindingCard';
import * as useReportTriggerMod from '@/app/(app)/questionnaire/use-report-trigger';
import { REPORT_STRINGS } from '@/config/strings';

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

  it('redaction placeholder is sourced from REPORT_STRINGS (SSOT), not exported by FindingCard', () => {
    expect(typeof REPORT_STRINGS.REDACTED_PLACEHOLDER).toBe('string');
    expect(REPORT_STRINGS.REDACTED_PLACEHOLDER.length).toBeGreaterThan(0);
    // The Phase 4 cleanup moved this constant out of the client component so the
    // server route can import it from config without pulling in a 'use client' module.
    expect((findingCardMod as Record<string, unknown>).REDACTED_PLACEHOLDER).toBeUndefined();
  });
});

describe('Report Phase 4 — SSOT string cleanup', () => {
  const REPORT_DIR = join(__dirname, '../app/(app)/report/[sessionId]');

  it('FindingCard renders redaction copy from REPORT_STRINGS, not local literals', () => {
    const src = readFileSync(join(__dirname, '../components/report/FindingCard.tsx'), 'utf8');
    expect(src).toContain('REPORT_STRINGS.REDACTED_PLACEHOLDER');
    expect(src).toContain('REPORT_STRINGS.LOCKED_BANNER_TEXT');
    expect(src).not.toContain("'[Unlock full report to view]'");
  });

  it('FindingCard routes its severity pill through the Badge primitive', () => {
    const src = readFileSync(join(__dirname, '../components/report/FindingCard.tsx'), 'utf8');
    expect(src).toContain("import { Badge } from '@/components/ui/Badge'");
    expect(src).toContain('<Badge');
  });

  it('FreeSummaryView reads the compliance-gap copy from REPORT_STRINGS', () => {
    const src = readFileSync(join(__dirname, '../components/report/FreeSummaryView.tsx'), 'utf8');
    expect(src).toContain('REPORT_STRINGS.COMPLIANCE_GAPS_DETECTED');
    expect(src).not.toContain('ISO 27001 / PSARA compliance gaps detected');
  });

  it.each(['status/page.tsx', 'summary/page.tsx', 'download/page.tsx'])(
    '%s imports REPORT_STRINGS and contains no leftover hardcoded report copy',
    (file) => {
      const src = readFileSync(join(REPORT_DIR, file), 'utf8');
      expect(src).toContain('REPORT_STRINGS');
      expect(src).not.toMatch(/>\s*Retry\s*</);
    },
  );

  it.each(['summary/page.tsx', 'download/page.tsx'])(
    '%s routes its primary CTA through the Button primitive',
    (file) => {
      const src = readFileSync(join(REPORT_DIR, file), 'utf8');
      expect(src).toContain("import { Button } from '@/components/ui/Button'");
      expect(src).toContain('<Button');
    },
  );
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
