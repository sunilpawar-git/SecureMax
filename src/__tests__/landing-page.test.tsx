/**
 * @jest-environment jsdom
 *
 * Phase 8 tests — landing page completeness.
 * Intent: a cold visitor sees every conversion section in order (demo,
 * pricing, sample report, testimonials, FAQ) and the footer exposes
 * LinkedIn, WhatsApp, and the physical address.
 */

import { render, screen } from '@testing-library/react';
import LandingPage from '@/app/page';
import { PRICING, FAQ, FOOTER, SAMPLE_REPORT, DEMO, TESTIMONIALS, PAYMENT } from '@/config/strings';

describe('Landing page sections', () => {
  beforeEach(() => {
    render(<LandingPage />);
  });

  it('renders the demo walkthrough with all steps', () => {
    expect(screen.getByText(DEMO.TITLE)).toBeInTheDocument();
    for (const step of DEMO.STEPS) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    }
  });

  it('renders pricing with the price derived from PAYMENT config', () => {
    expect(screen.getByText(PRICING.TITLE)).toBeInTheDocument();
    const expectedPrice = `\u20B9${(PAYMENT.AMOUNT_PAISE / 100).toLocaleString('en-IN')}`;
    expect(PRICING.HNI_PRICE).toBe(expectedPrice);
    expect(screen.getByText(PRICING.HNI_PRICE)).toBeInTheDocument();
    expect(screen.getByText(PRICING.ENTERPRISE_PRICE)).toBeInTheDocument();
  });

  it('renders the sample report preview with watermark and CTA', () => {
    expect(screen.getByText(SAMPLE_REPORT.TITLE)).toBeInTheDocument();
    expect(screen.getByText(SAMPLE_REPORT.WATERMARK)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: SAMPLE_REPORT.CTA })).toBeInTheDocument();
  });

  it('renders three testimonials with the methodology badge', () => {
    expect(screen.getByText(TESTIMONIALS.TITLE)).toBeInTheDocument();
    for (const t of TESTIMONIALS.ITEMS) {
      expect(screen.getByText(t.author)).toBeInTheDocument();
    }
  });

  it('renders every FAQ question', () => {
    expect(screen.getByText(FAQ.TITLE)).toBeInTheDocument();
    for (const item of FAQ.ITEMS) {
      expect(screen.getByText(item.q)).toBeInTheDocument();
    }
  });

  it('footer exposes LinkedIn, WhatsApp, and the physical address', () => {
    const linkedin = screen.getByRole('link', { name: FOOTER.LINKEDIN_LABEL });
    expect(linkedin).toHaveAttribute('href', FOOTER.LINKEDIN_URL);

    const whatsapp = screen.getByRole('link', { name: FOOTER.WHATSAPP_LABEL });
    expect(whatsapp).toHaveAttribute('href', FOOTER.WHATSAPP_CONTACT);

    expect(screen.getByText(FOOTER.ADDRESS)).toBeInTheDocument();
  });
});
