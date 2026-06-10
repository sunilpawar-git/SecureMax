/**
 * @jest-environment jsdom
 *
 * PricingSection (Phase 8) — both cards render with config-sourced prices,
 * CTAs link to the correct sign-in tracks, and the section passes an axe
 * accessibility smoke check.
 */

import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { PricingSection } from '../PricingSection';
import { PRICING } from '@/config/strings';

expect.extend(toHaveNoViolations);

describe('PricingSection', () => {
  it('renders both price cards with feature lists', () => {
    render(<PricingSection />);

    expect(screen.getByText(PRICING.HNI_TITLE)).toBeInTheDocument();
    expect(screen.getByText(PRICING.HNI_PRICE)).toBeInTheDocument();
    expect(screen.getByText(PRICING.ENTERPRISE_TITLE)).toBeInTheDocument();
    expect(screen.getByText(PRICING.ENTERPRISE_PRICE)).toBeInTheDocument();

    for (const feature of [...PRICING.HNI_FEATURES, ...PRICING.ENTERPRISE_FEATURES]) {
      expect(screen.getByText(feature)).toBeInTheDocument();
    }
  });

  it('CTAs target the correct sign-in tracks', () => {
    render(<PricingSection />);
    expect(screen.getByRole('link', { name: PRICING.HNI_CTA })).toHaveAttribute(
      'href',
      '/auth/signin?track=hni',
    );
    expect(screen.getByRole('link', { name: PRICING.ENTERPRISE_CTA })).toHaveAttribute(
      'href',
      '/auth/signin?track=enterprise',
    );
  });

  it('uses a proper heading hierarchy', () => {
    render(<PricingSection />);
    expect(screen.getByRole('heading', { level: 2, name: PRICING.TITLE })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
  });

  it('has no axe accessibility violations', async () => {
    const { container } = render(<PricingSection />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
