/**
 * Phase 2 — Report viewer pages.
 * Verifies modules export valid defaults and components have correct shapes.
 */

describe('Report viewer pages export valid modules', () => {
  it('report status page exports a default function', () => {
    const mod = require('@/app/(app)/report/[sessionId]/status/page');
    expect(typeof mod.default).toBe('function');
  });

  it('report summary page exports a default function', () => {
    const mod = require('@/app/(app)/report/[sessionId]/summary/page');
    expect(typeof mod.default).toBe('function');
  });

  it('report download page exports a default function', () => {
    const mod = require('@/app/(app)/report/[sessionId]/download/page');
    expect(typeof mod.default).toBe('function');
  });
});

describe('Report components export correctly', () => {
  it('FreeSummaryView is a named export function', () => {
    const mod = require('@/components/report/FreeSummaryView');
    expect(typeof mod.FreeSummaryView).toBe('function');
  });

  it('FindingCard is a named export function', () => {
    const mod = require('@/components/report/FindingCard');
    expect(typeof mod.FindingCard).toBe('function');
  });

  it('FindingCard exports REDACTED_PLACEHOLDER constant', () => {
    const mod = require('@/components/report/FindingCard');
    expect(typeof mod.REDACTED_PLACEHOLDER).toBe('string');
    expect(mod.REDACTED_PLACEHOLDER.length).toBeGreaterThan(0);
  });
});

describe('Report trigger hook', () => {
  it('useReportTrigger is a named export function', () => {
    const mod = require('@/app/(app)/questionnaire/use-report-trigger');
    expect(typeof mod.useReportTrigger).toBe('function');
  });
});
