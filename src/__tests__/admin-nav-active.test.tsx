/**
 * @jest-environment jsdom
 *
 * AdminNav — active route highlighting (Phase 1B).
 * Asserts that exactly the nav item matching the current pathname receives the
 * active style token, and that '/admin' (Dashboard) only matches exactly so
 * sub-routes don't light it up too.
 */
import { render, screen } from '@testing-library/react';
import { AdminNav } from '@/app/admin/_components/AdminNav';
import { ADMIN_NAV_ITEMS } from '@/config/admin-strings';
import { ADMIN_NAV_ACTIVE_LINK_STYLE, ADMIN_NAV_LINK_STYLE } from '@/config/admin-colors';

const mockUsePathname = jest.fn<string, []>();

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: React.PropsWithChildren<{ href: string; className?: string }>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
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

function getInlineNavLink(label: string): HTMLElement {
  // Both the inline row and the (closed) drawer can contain the label;
  // the inline row is the first match.
  return screen.getAllByRole('link', { name: label })[0];
}

describe('AdminNav — active route highlighting', () => {
  it('marks only the Leads item active on /admin/leads', () => {
    mockUsePathname.mockReturnValue('/admin/leads');
    render(<AdminNav />);

    for (const item of ADMIN_NAV_ITEMS) {
      const link = getInlineNavLink(item.label);
      if (item.href === '/admin/leads') {
        expect(link).toHaveClass(...ADMIN_NAV_ACTIVE_LINK_STYLE.split(' '));
        expect(link).toHaveAttribute('aria-current', 'page');
      } else {
        expect(link).toHaveClass(...ADMIN_NAV_LINK_STYLE.split(' '));
        expect(link).not.toHaveAttribute('aria-current');
      }
    }
  });

  it('marks the parent section active on a sub-route (/admin/leads/123)', () => {
    mockUsePathname.mockReturnValue('/admin/leads/123');
    render(<AdminNav />);

    expect(getInlineNavLink('Enterprise Leads')).toHaveAttribute('aria-current', 'page');
    expect(getInlineNavLink('Dashboard')).not.toHaveAttribute('aria-current');
  });

  it('marks Dashboard active only on exact /admin match', () => {
    mockUsePathname.mockReturnValue('/admin');
    render(<AdminNav />);

    expect(getInlineNavLink('Dashboard')).toHaveAttribute('aria-current', 'page');
  });

  it('includes Knowledge Base in the nav (Phase 1A regression guard)', () => {
    mockUsePathname.mockReturnValue('/admin/knowledge-base');
    render(<AdminNav />);

    const kbLink = getInlineNavLink('Knowledge Base');
    expect(kbLink).toHaveAttribute('href', '/admin/knowledge-base');
    expect(kbLink).toHaveAttribute('aria-current', 'page');
  });
});
