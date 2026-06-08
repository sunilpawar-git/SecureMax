/**
 * @jest-environment jsdom
 *
 * Button primitive — variant/size mapping, loading + disabled behavior, a11y.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '../Button';
import { BUTTON_STYLES } from '@/config/colors';

expect.extend(toHaveNoViolations);

describe('Button', () => {
  it('applies base + default (primary/md) classes from BUTTON_STYLES', () => {
    render(<Button>Go</Button>);
    const btn = screen.getByRole('button', { name: 'Go' });
    expect(btn.className).toContain(BUTTON_STYLES.base);
    expect(btn.className).toContain(BUTTON_STYLES.variant.primary);
    expect(btn.className).toContain(BUTTON_STYLES.size.md);
  });

  it.each(['primary', 'secondary', 'ghost', 'destructive'] as const)(
    'maps variant "%s" to its BUTTON_STYLES token',
    (variant) => {
      render(<Button variant={variant}>X</Button>);
      expect(screen.getByRole('button').className).toContain(BUTTON_STYLES.variant[variant]);
    },
  );

  it.each(['sm', 'md', 'lg'] as const)('maps size "%s" to its BUTTON_STYLES token', (size) => {
    render(<Button size={size}>X</Button>);
    expect(screen.getByRole('button').className).toContain(BUTTON_STYLES.size[size]);
  });

  it('shows a spinner and disables the button when loading', () => {
    const { container } = render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('does not invoke onClick when disabled', async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();
    render(
      <Button disabled onClick={onClick}>
        X
      </Button>,
    );
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not invoke onClick when loading', async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();
    render(
      <Button loading onClick={onClick}>
        X
      </Button>,
    );
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('invokes onClick when enabled', async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>X</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations', async () => {
    const { container } = render(<Button>Accessible</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
