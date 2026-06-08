/**
 * @jest-environment jsdom
 *
 * LandingHeader (Phase 3) — verifies the public header renders its brand + sign-in
 * link, and that the mobile hamburger opens the reused MobileNavDrawer with a
 * Sign In item (no auth, no track param). axe smoke on both states.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { LandingHeader } from '../LandingHeader';
import { APP, NAV, NAV_DRAWER } from '@/config/strings';

expect.extend(toHaveNoViolations);

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    onClick,
    className,
  }: React.PropsWithChildren<{ href: string; onClick?: () => void; className?: string }>) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}));

describe('LandingHeader', () => {
  it('renders the brand logo linking to the landing page', () => {
    render(<LandingHeader />);
    const logo = screen.getByRole('link', { name: APP.NAME });
    expect(logo).toHaveAttribute('href', '/');
  });

  it('does not open the drawer until the hamburger is pressed', () => {
    render(<LandingHeader />);
    expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument();
  });

  it('opens the drawer with a Sign In item (href /auth/signin, no track param)', async () => {
    const user = userEvent.setup();
    render(<LandingHeader />);
    await user.click(screen.getByRole('button', { name: NAV_DRAWER.OPEN }));

    const drawer = screen.getByTestId('mobile-nav-drawer');
    expect(drawer).toBeInTheDocument();
    const signIn = screen.getAllByRole('link', { name: NAV.SIGN_IN });
    expect(signIn.some((el) => el.getAttribute('href') === '/auth/signin')).toBe(true);
    signIn.forEach((el) => expect(el.getAttribute('href')).not.toContain('track='));
  });

  it('closes the drawer on Escape', async () => {
    const user = userEvent.setup();
    render(<LandingHeader />);
    await user.click(screen.getByRole('button', { name: NAV_DRAWER.OPEN }));
    expect(screen.getByTestId('mobile-nav-drawer')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('mobile-nav-drawer')).not.toBeInTheDocument();
  });

  it('has no axe violations (closed and open)', async () => {
    const user = userEvent.setup();
    const { container } = render(<LandingHeader />);
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: NAV_DRAWER.OPEN }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
