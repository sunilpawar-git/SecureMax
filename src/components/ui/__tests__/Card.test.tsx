/**
 * @jest-environment jsdom
 *
 * Card primitive — variant mapping, children passthrough, a11y.
 */
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Card } from '../Card';
import { CARD_STYLES } from '@/config/colors';

expect.extend(toHaveNoViolations);

describe('Card', () => {
  it('applies the default variant from CARD_STYLES', () => {
    render(<Card data-testid="c">body</Card>);
    expect(screen.getByTestId('c').className).toContain(CARD_STYLES.default);
  });

  it('maps the flat variant to CARD_STYLES.flat', () => {
    render(
      <Card variant="flat" data-testid="c">
        body
      </Card>,
    );
    expect(screen.getByTestId('c').className).toContain(CARD_STYLES.flat);
  });

  it('renders children and merges extra className', () => {
    render(
      <Card className="extra" data-testid="c">
        <span>inner</span>
      </Card>,
    );
    const el = screen.getByTestId('c');
    expect(el.className).toContain('extra');
    expect(screen.getByText('inner')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(<Card>content</Card>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
