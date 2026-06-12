/**
 * @jest-environment jsdom
 *
 * Phase 2 tests — ServiceHealthBanner.
 * Intent: each config problem produces its specific actionable warning;
 * a fully healthy state renders nothing.
 */

import { render, screen } from '@testing-library/react';
import { ServiceHealthBanner } from '@/app/admin/linkedin/_components/ServiceHealthBanner';
import { HEALTH_STRINGS } from '@/config/admin-strings';

describe('ServiceHealthBanner', () => {
  it('renders nothing while health is loading (null)', () => {
    const { container } = render(<ServiceHealthBanner health={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when everything is healthy', () => {
    const { container } = render(
      <ServiceHealthBanner
        health={{ aiServiceReachable: true, aiServiceAuthOk: true, linkedinConfigured: true }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('warns when the AI service is unreachable', () => {
    render(
      <ServiceHealthBanner
        health={{ aiServiceReachable: false, aiServiceAuthOk: false, linkedinConfigured: true }}
      />,
    );
    expect(screen.getByText(HEALTH_STRINGS.AI_UNREACHABLE)).toBeInTheDocument();
    // Unreachable already implies auth cannot be checked — no duplicate warning
    expect(screen.queryByText(HEALTH_STRINGS.AI_AUTH_FAILED)).not.toBeInTheDocument();
  });

  it('warns when the service key is rejected', () => {
    render(
      <ServiceHealthBanner
        health={{ aiServiceReachable: true, aiServiceAuthOk: false, linkedinConfigured: true }}
      />,
    );
    expect(screen.getByText(HEALTH_STRINGS.AI_AUTH_FAILED)).toBeInTheDocument();
  });

  it('warns when LinkedIn credentials are not configured', () => {
    render(
      <ServiceHealthBanner
        health={{ aiServiceReachable: true, aiServiceAuthOk: true, linkedinConfigured: false }}
      />,
    );
    expect(screen.getByText(HEALTH_STRINGS.LINKEDIN_UNCONFIGURED)).toBeInTheDocument();
  });
});
