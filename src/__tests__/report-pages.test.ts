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
    expect(typeof (useReportTriggerMod as Record<string, unknown>).useReportTrigger).toBe('function');
  });
});
