'use client';

/**
 * Admin nav bar with global search — extracted from layout for size compliance.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useEffect, useState } from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { APP, NAV, NAV_DRAWER } from '@/config/strings';
import { ADMIN_NAV_ITEMS } from '@/config/admin-strings';
import {
  ADMIN_EXIT_LINK_STYLE,
  ADMIN_NAV_LINK_STYLE,
  ADMIN_NAV_ACTIVE_LINK_STYLE,
} from '@/config/admin-colors';
import { MobileNavDrawer, type NavDrawerItem } from '@/components/MobileNavDrawer';
import { useGlobalSearch } from '../_hooks/useGlobalSearch';
import { SearchDropdown } from './SearchDropdown';

// '/admin' must match exactly, otherwise every sub-route would mark Dashboard active
function isActiveRoute(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const search = useGlobalSearch();
  const pathname = usePathname();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const items: NavDrawerItem[] = ADMIN_NAV_ITEMS.map((item) => ({
    label: item.label,
    href: item.href,
  }));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        search.setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [search]);

  return (
    <nav className="bg-slate-900 text-white px-3 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center gap-3 md:gap-6">
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-bold text-sm whitespace-nowrap">{APP.NAME} Admin</span>
          <Link href="/dashboard" className={ADMIN_EXIT_LINK_STYLE}>
            {NAV.EXIT_ADMIN}
          </Link>
        </div>

        <div className="hidden md:flex gap-4 overflow-x-auto flex-shrink-0">
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = isActiveRoute(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={active ? ADMIN_NAV_ACTIVE_LINK_STYLE : ADMIN_NAV_LINK_STYLE}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div
          ref={wrapperRef}
          className="hidden md:block relative ml-auto w-full max-w-xs flex-shrink"
        >
          <input
            type="text"
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
            onFocus={() => {
              if (search.hasResults) search.setIsOpen(true);
            }}
            placeholder="Search..."
            aria-label="Search admin"
            className="w-full text-sm rounded-md bg-slate-800 border border-slate-700 text-white px-3 py-1.5 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <SearchDropdown data={search} />
        </div>

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={NAV_DRAWER.OPEN}
          className="md:hidden rounded-lg p-2.5 text-gray-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      <MobileNavDrawer items={items} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </nav>
  );
}
