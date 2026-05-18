/**
 * Tests for the report diff engine — pure function, no mocks needed.
 */

import { compareReports } from '@/lib/admin/diff-engine';

describe('compareReports', () => {
  it('returns empty diff for identical reports', () => {
    const report = {
      findings: [{ domain: 'CPP-01', title: 'Weak perimeter' }],
      domain_scores: [{ domain: 'CPP-01', score: 60 }],
      urgency_score: 75,
    };
    const diff = compareReports(report, report);
    expect(diff.hasChanges).toBe(false);
    expect(diff.addedFindings).toHaveLength(0);
    expect(diff.removedFindings).toHaveLength(0);
    expect(diff.scoreChanges).toHaveLength(0);
    expect(diff.urgencyDelta).toBe(0);
  });

  it('detects added findings', () => {
    const prev = { findings: [{ domain: 'CPP-01', title: 'A' }] };
    const curr = {
      findings: [
        { domain: 'CPP-01', title: 'A' },
        { domain: 'CPP-02', title: 'B' },
      ],
    };
    const diff = compareReports(prev, curr);
    expect(diff.addedFindings).toHaveLength(1);
    expect(diff.addedFindings[0].title).toBe('B');
    expect(diff.hasChanges).toBe(true);
  });

  it('detects removed findings', () => {
    const prev = {
      findings: [
        { domain: 'CPP-01', title: 'A' },
        { domain: 'CPP-02', title: 'B' },
      ],
    };
    const curr = { findings: [{ domain: 'CPP-01', title: 'A' }] };
    const diff = compareReports(prev, curr);
    expect(diff.removedFindings).toHaveLength(1);
    expect(diff.removedFindings[0].title).toBe('B');
  });

  it('detects score changes', () => {
    const prev = { domain_scores: [{ domain: 'CPP-01', score: 60 }] };
    const curr = { domain_scores: [{ domain: 'CPP-01', score: 80 }] };
    const diff = compareReports(prev, curr);
    expect(diff.scoreChanges).toHaveLength(1);
    expect(diff.scoreChanges[0]).toEqual({ domain: 'CPP-01', oldScore: 60, newScore: 80 });
  });

  it('detects urgency delta', () => {
    const prev = { urgency_score: 50 };
    const curr = { urgency_score: 75 };
    const diff = compareReports(prev, curr);
    expect(diff.urgencyDelta).toBe(25);
    expect(diff.hasChanges).toBe(true);
  });

  it('handles null previous report', () => {
    const curr = { findings: [{ domain: 'CPP-01', title: 'A' }] };
    const diff = compareReports(null, curr);
    expect(diff.addedFindings).toHaveLength(1);
    expect(diff.removedFindings).toHaveLength(0);
    expect(diff.hasChanges).toBe(true);
  });

  it('handles empty findings arrays', () => {
    const diff = compareReports({ findings: [] }, { findings: [] });
    expect(diff.hasChanges).toBe(false);
  });

  it('detects new domains appearing in scores', () => {
    const prev = { domain_scores: [{ domain: 'CPP-01', score: 50 }] };
    const curr = {
      domain_scores: [
        { domain: 'CPP-01', score: 50 },
        { domain: 'CPP-03', score: 70 },
      ],
    };
    const diff = compareReports(prev, curr);
    expect(diff.scoreChanges).toHaveLength(1);
    expect(diff.scoreChanges[0].domain).toBe('CPP-03');
    expect(diff.scoreChanges[0].oldScore).toBe(0);
    expect(diff.scoreChanges[0].newScore).toBe(70);
  });
});
