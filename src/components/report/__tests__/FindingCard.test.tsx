/**
 * @jest-environment jsdom
 *
 * FindingCard (Phase 4) — verifies the locked/unlocked redaction contract
 * (defense-in-depth: a locked card never leaks the answer or recommendation),
 * that the severity pill renders through the Badge primitive with the shared
 * SEVERITY_STYLES token, and an axe smoke pass on both states.
 */
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { FindingCard, type Finding } from '../FindingCard';
import { REPORT_STRINGS } from '@/config/strings';
import { SEVERITY_STYLES } from '@/config/colors';

expect.extend(toHaveNoViolations);

const finding: Finding = {
  domain: 'CPP-01',
  domain_name: 'Physical Security',
  severity: 'critical',
  question: 'Is the perimeter monitored after hours?',
  answer: 'No monitoring between 22:00 and 06:00.',
  recommendation: 'Add motion-triggered CCTV with off-site alerting.',
};

describe('FindingCard', () => {
  it('shows the answer + recommendation when unlocked', () => {
    render(<FindingCard finding={finding} locked={false} />);
    expect(screen.getByText(finding.answer)).toBeInTheDocument();
    expect(screen.getByText(finding.recommendation)).toBeInTheDocument();
    expect(screen.queryByText(REPORT_STRINGS.REDACTED_PLACEHOLDER)).not.toBeInTheDocument();
  });

  it('redacts the answer and hides the recommendation when locked', () => {
    render(<FindingCard finding={finding} locked={true} />);
    expect(screen.getByText(REPORT_STRINGS.REDACTED_PLACEHOLDER)).toBeInTheDocument();
    expect(screen.queryByText(finding.answer)).not.toBeInTheDocument();
    expect(screen.queryByText(finding.recommendation)).not.toBeInTheDocument();
    expect(screen.getByText(REPORT_STRINGS.LOCKED_BANNER_TEXT)).toBeInTheDocument();
  });

  it('renders the severity pill via Badge using the shared SEVERITY_STYLES token', () => {
    render(<FindingCard finding={finding} locked={false} />);
    const pill = screen.getByText(finding.severity.toUpperCase());
    // SEVERITY_STYLES bundles several utilities; assert the leading color class lands.
    expect(pill.className).toContain(SEVERITY_STYLES[finding.severity].split(' ')[0]);
  });

  it('has no axe violations (locked and unlocked)', async () => {
    const unlocked = render(<FindingCard finding={finding} locked={false} />);
    expect(await axe(unlocked.container)).toHaveNoViolations();
    unlocked.unmount();
    const locked = render(<FindingCard finding={finding} locked={true} />);
    expect(await axe(locked.container)).toHaveNoViolations();
  });
});
