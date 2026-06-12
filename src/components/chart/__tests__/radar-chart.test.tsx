/**
 * @jest-environment jsdom
 *
 * RadarChart — verifies the SVG renders with the aria-label, that the legend
 * appears and can be suppressed, that all 7 CPP domain short-codes are drawn
 * as text labels, and that the color-coding logic (green/amber/red) is correct
 * at the boundaries defined by RADAR_THRESHOLDS.
 *
 * useCountUp is mocked: it owns its own behaviour tests in use-count-up.test.tsx.
 * This test focuses on composition and domain logic, not animation.
 */
import { render, screen } from '@testing-library/react';
import { RadarChart } from '../radar-chart';
import { CPP_DOMAINS, RADAR_THRESHOLDS, QUESTIONNAIRE } from '@/config/strings';
import { COLORS } from '@/config/colors';

jest.mock('@/components/chart/use-count-up', () => ({
  useCountUp: (n: number) => n,
}));

const ALL_SCORES = Object.fromEntries(Object.values(CPP_DOMAINS).map((d) => [d.code, 50]));

const HIGH_SCORES = Object.fromEntries(
  Object.values(CPP_DOMAINS).map((d) => [d.code, RADAR_THRESHOLDS.GREEN_MIN]),
);

const LOW_SCORES = Object.fromEntries(
  Object.values(CPP_DOMAINS).map((d) => [d.code, RADAR_THRESHOLDS.AMBER_MIN - 1]),
);

describe('RadarChart', () => {
  it('renders the SVG with the correct aria-label', () => {
    render(<RadarChart scores={ALL_SCORES} />);
    expect(screen.getByRole('img', { name: QUESTIONNAIRE.RADAR_ARIA })).toBeInTheDocument();
  });

  it('renders data-testid="radar-chart" for query convenience', () => {
    render(<RadarChart scores={ALL_SCORES} />);
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
  });

  it('renders a short-code text label for all 7 CPP domains', () => {
    render(<RadarChart scores={ALL_SCORES} />);
    // CPP-01..07 → "1".."7" after replace('CPP-0', '')
    for (let i = 1; i <= 7; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it('shows the score and the /100 suffix', () => {
    render(<RadarChart scores={ALL_SCORES} />);
    expect(screen.getByText(QUESTIONNAIRE.SCORE_OUT_OF)).toBeInTheDocument();
    // avgScore of all-50 inputs → displayed as 50
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('renders the legend with all CPP domain names by default', () => {
    render(<RadarChart scores={ALL_SCORES} />);
    for (const domain of Object.values(CPP_DOMAINS)) {
      expect(screen.getByText(domain.name)).toBeInTheDocument();
    }
  });

  it('hides the legend when showLegend={false}', () => {
    render(<RadarChart scores={ALL_SCORES} showLegend={false} />);
    for (const domain of Object.values(CPP_DOMAINS)) {
      expect(screen.queryByText(domain.name)).not.toBeInTheDocument();
    }
  });

  it('colours the radar polygon green when avg score >= GREEN_MIN threshold', () => {
    const { container } = render(<RadarChart scores={HIGH_SCORES} />);
    const polygon = container.querySelector('.radar-polygon');
    expect(polygon).toHaveAttribute('fill', COLORS.radar.green);
    expect(polygon).toHaveAttribute('stroke', COLORS.radar.green);
  });

  it('colours the radar polygon red when avg score < AMBER_MIN threshold', () => {
    const { container } = render(<RadarChart scores={LOW_SCORES} />);
    const polygon = container.querySelector('.radar-polygon');
    expect(polygon).toHaveAttribute('fill', COLORS.radar.red);
    expect(polygon).toHaveAttribute('stroke', COLORS.radar.red);
  });

  it('draws exactly 4 grid-level path rings inside the SVG', () => {
    const { container } = render(<RadarChart scores={ALL_SCORES} />);
    // 4 grid paths + 1 data polygon = 5 <path> elements total
    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBe(5);
  });

  it('draws 7 radial lines (one per CPP domain)', () => {
    const { container } = render(<RadarChart scores={ALL_SCORES} />);
    const lines = container.querySelectorAll('svg line');
    expect(lines.length).toBe(Object.keys(CPP_DOMAINS).length);
  });
});
