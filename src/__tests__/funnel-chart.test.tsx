/**
 * @jest-environment jsdom
 *
 * Phase 10 tests — FunnelChart (pure SVG, no chart library).
 * Renders bars + counts with data, shows the empty state on all-zero data,
 * and labels every stage for accessibility.
 */

import { render, screen } from '@testing-library/react';
import { FunnelChart } from '@/app/admin/analytics/_components/FunnelChart';
import { ANALYTICS_STRINGS } from '@/config/analytics-strings';
import type { FunnelStage } from '@/lib/admin/analytics-service';

const STAGES: FunnelStage[] = [
  { stage: 'Signed Up', count: 100, dropOffPct: 0 },
  { stage: 'Started Session', count: 80, dropOffPct: 20 },
  { stage: 'Completed Session', count: 40, dropOffPct: 50 },
  { stage: 'Paid', count: 10, dropOffPct: 75 },
  { stage: 'Downloaded Report', count: 8, dropOffPct: 20 },
];

describe('FunnelChart', () => {
  it('renders an svg with every stage label and count', () => {
    const { container } = render(<FunnelChart stages={STAGES} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    for (const s of STAGES) {
      expect(screen.getByText(s.stage)).toBeInTheDocument();
    }
    expect(screen.getByText(/\u221250% drop-off/)).toBeInTheDocument();
  });

  it('has an aria-label on the chart and on every stage group', () => {
    const { container } = render(<FunnelChart stages={STAGES} />);
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-label',
      ANALYTICS_STRINGS.FUNNEL_TITLE,
    );
    const groups = container.querySelectorAll('g[aria-label]');
    expect(groups).toHaveLength(STAGES.length);
    expect(groups[0]).toHaveAttribute('aria-label', 'Signed Up: 100');
  });

  it('shows the empty state for all-zero data instead of a broken chart', () => {
    const zeroed = STAGES.map((s) => ({ ...s, count: 0, dropOffPct: 0 }));
    const { container } = render(<FunnelChart stages={zeroed} />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
    expect(screen.getByText(ANALYTICS_STRINGS.FUNNEL_EMPTY)).toBeInTheDocument();
  });

  it('shows the empty state for an empty stage list', () => {
    render(<FunnelChart stages={[]} />);
    expect(screen.getByText(ANALYTICS_STRINGS.FUNNEL_EMPTY)).toBeInTheDocument();
  });
});
