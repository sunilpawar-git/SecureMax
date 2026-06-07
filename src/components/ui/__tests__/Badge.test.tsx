/**
 * @jest-environment jsdom
 *
 * Badge primitive — variant mapping, children passthrough, a11y.
 */
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Badge } from '../Badge';
import { BADGE_STYLES } from '@/config/colors';

expect.extend(toHaveNoViolations);

describe('Badge', () => {
  it('defaults to the slate variant', () => {
    render(<Badge data-testid="b">New</Badge>);
    expect(screen.getByTestId('b').className).toContain(BADGE_STYLES.slate);
  });

  it.each(['emerald', 'slate', 'amber'] as const)(
    'maps variant "%s" to its BADGE_STYLES token',
    (variant) => {
      render(
        <Badge variant={variant} data-testid="b">
          X
        </Badge>,
      );
      expect(screen.getByTestId('b').className).toContain(BADGE_STYLES[variant]);
    },
  );

  it('renders its children', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <p>
        Status: <Badge variant="emerald">OK</Badge>
      </p>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
