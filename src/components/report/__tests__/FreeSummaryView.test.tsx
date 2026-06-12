/**
 * @jest-environment jsdom
 *
 * FreeSummaryView (Phase 4) — verifies the compliance-gap banner is enterprise-
 * only (and reads its copy from REPORT_STRINGS), that findings render locked
 * (redacted), and an axe smoke pass. RadarChart is mocked: it owns its own
 * count-up/SVG tests, so this stays focused on the summary composition.
 */
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { FreeSummaryView } from '../FreeSummaryView';
import { REPORT_STRINGS, TRACK } from '@/config/strings';
import type { Finding } from '../FindingCard';

expect.extend(toHaveNoViolations);

jest.mock('@/components/chart/radar-chart', () => ({
  RadarChart: () => <div data-testid="radar-chart" />,
}));

const scores = { 'CPP-01': 40, 'CPP-02': 55 };

const findings: Finding[] = [
  {
    domain: 'CPP-01',
    domain_name: 'Physical Security',
    severity: 'high',
    question: 'Perimeter monitored?',
    answer: 'No.',
    recommendation: 'Add CCTV.',
  },
];

describe('FreeSummaryView', () => {
  it('shows the compliance-gap banner for enterprise with gaps', () => {
    render(
      <FreeSummaryView
        domainScores={scores}
        findings={findings}
        urgencyScore={72}
        complianceGapCount={3}
        track={TRACK.ENTERPRISE}
      />,
    );
    expect(screen.getByText(REPORT_STRINGS.COMPLIANCE_GAPS_DETECTED)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('hides the compliance-gap banner for the HNI track', () => {
    render(
      <FreeSummaryView
        domainScores={scores}
        findings={findings}
        urgencyScore={72}
        complianceGapCount={3}
        track={TRACK.HNI}
      />,
    );
    expect(screen.queryByText(REPORT_STRINGS.COMPLIANCE_GAPS_DETECTED)).not.toBeInTheDocument();
  });

  it('renders the findings heading with the count and locks each finding', () => {
    render(
      <FreeSummaryView
        domainScores={scores}
        findings={findings}
        urgencyScore={20}
        track={TRACK.HNI}
      />,
    );
    expect(
      screen.getByText(`${REPORT_STRINGS.FINDINGS_HEADING} (${findings.length})`),
    ).toBeInTheDocument();
    // Locked: the answer is redacted, never shown verbatim.
    expect(screen.getByText(REPORT_STRINGS.REDACTED_PLACEHOLDER)).toBeInTheDocument();
    expect(screen.queryByText('No.')).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <FreeSummaryView
        domainScores={scores}
        findings={findings}
        urgencyScore={72}
        complianceGapCount={3}
        track={TRACK.ENTERPRISE}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
