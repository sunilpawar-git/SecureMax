/**
 * @jest-environment jsdom
 *
 * FAQSection (Phase 8) — all 7 questions render as native details/summary
 * accordions with their answers in the DOM (CSS-only, no client JS).
 */

import { render, screen } from '@testing-library/react';
import { FAQSection } from '../FAQSection';
import { FAQ } from '@/config/strings';

describe('FAQSection', () => {
  it('defines exactly 7 questions in config', () => {
    expect(FAQ.ITEMS).toHaveLength(7);
  });

  it('renders every question and answer', () => {
    render(<FAQSection />);
    for (const item of FAQ.ITEMS) {
      expect(screen.getByText(item.q)).toBeInTheDocument();
      expect(screen.getByText(item.a)).toBeInTheDocument();
    }
  });

  it('uses native details elements (CSS-only accordion)', () => {
    const { container } = render(<FAQSection />);
    expect(container.querySelectorAll('details')).toHaveLength(FAQ.ITEMS.length);
  });
});
