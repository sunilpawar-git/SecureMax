/**
 * @jest-environment jsdom
 *
 * AdminNav — mobile nav drawer regression coverage (admin mobile-overflow fix).
 * Locks in the two new assertions from the fix plan:
 *   1. the inline ADMIN_NAV_ITEMS row is `hidden md:flex` so it can't silently
 *      go back to rendering all 10 links inline and overflowing on narrow viewports;
 *   2. the hamburger opens MobileNavDrawer pre-loaded with every nav item.
 * MobileNavDrawer's own open/close/focus-trap/Escape behavior is already covered
 * by its own suite — this only guards AdminNav's wiring into it.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminNav } from '@/app/admin/_components/AdminNav';
import { ADMIN_NAV_ITEMS } from '@/config/admin-strings';
import { NAV_DRAWER } from '@/config/strings';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock('@/app/admin/_hooks/useGlobalSearch', () => ({
  useGlobalSearch: () => ({
    query: '',
    setQuery: jest.fn(),
    results: { users: [], sessions: [], leads: [], threatIntel: [] },
    isOpen: false,
    setIsOpen: jest.fn(),
    hasResults: false,
  }),
}));

describe('AdminNav — mobile nav drawer', () => {
  it('hides the inline ADMIN_NAV_ITEMS row below md: (guards against overflow regression)', () => {
    render(<AdminNav />);

    const dashboardLink = screen.getByRole('link', { name: ADMIN_NAV_ITEMS[0].label });
    const navRow = dashboardLink.parentElement;
    expect(navRow).toHaveClass('hidden', 'md:flex');
  });

  it('hamburger opens the drawer pre-loaded with every ADMIN_NAV_ITEMS link', async () => {
    const user = userEvent.setup();
    render(<AdminNav />);

    await user.click(screen.getByRole('button', { name: NAV_DRAWER.OPEN }));

    const drawer = screen.getByRole('dialog');
    for (const item of ADMIN_NAV_ITEMS) {
      expect(within(drawer).getByRole('link', { name: item.label })).toBeInTheDocument();
    }
  });
});
