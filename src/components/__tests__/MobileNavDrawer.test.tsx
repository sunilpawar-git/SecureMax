/**
 * @jest-environment jsdom
 *
 * MobileNavDrawer — verifies the behavioral contract it owns: renders only when
 * open, Escape + backdrop close, Tab focus-trap wraps in both directions, item
 * activation closes, and no axe violations.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MobileNavDrawer, type NavDrawerItem } from '../MobileNavDrawer';
import { NAV_DRAWER } from '@/config/strings';

expect.extend(toHaveNoViolations);

const items: NavDrawerItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Sign Out', onClick: jest.fn() },
];

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    onClick,
  }: React.PropsWithChildren<{ href: string; onClick?: () => void }>) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

describe('MobileNavDrawer', () => {
  it('renders nothing when closed', () => {
    render(<MobileNavDrawer items={items} open={false} onClose={jest.fn()} />);
    expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<MobileNavDrawer items={items} open onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is clicked', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<MobileNavDrawer items={items} open onClose={onClose} />);
    await user.click(screen.getByTestId('mobile-nav-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps focus: Tab from the last focusable wraps to the first', async () => {
    const user = userEvent.setup();
    render(<MobileNavDrawer items={items} open onClose={jest.fn()} />);

    const closeBtn = screen.getByRole('button', { name: NAV_DRAWER.CLOSE });
    const signOut = screen.getByRole('button', { name: 'Sign Out' });
    expect(closeBtn).toHaveFocus(); // first focusable auto-focused on open

    signOut.focus();
    await user.tab();
    expect(closeBtn).toHaveFocus();
  });

  it('Shift+Tab from the first focusable wraps to the last', async () => {
    const user = userEvent.setup();
    render(<MobileNavDrawer items={items} open onClose={jest.fn()} />);

    const closeBtn = screen.getByRole('button', { name: NAV_DRAWER.CLOSE });
    const signOut = screen.getByRole('button', { name: 'Sign Out' });
    closeBtn.focus();
    await user.tab({ shift: true });
    expect(signOut).toHaveFocus();
  });

  it('invokes the item onClick and closes when an action item is chosen', async () => {
    const onClose = jest.fn();
    const onClick = jest.fn();
    const user = userEvent.setup();
    render(<MobileNavDrawer items={[{ label: 'Sign Out', onClick }]} open onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Sign Out' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations', async () => {
    const { container } = render(<MobileNavDrawer items={items} open onClose={jest.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
