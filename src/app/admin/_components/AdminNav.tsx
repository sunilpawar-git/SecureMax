'use client';

/**
 * Admin nav bar with global search — extracted from layout for size compliance.
 */

import Link from 'next/link';
import { useRef, useEffect } from 'react';
import { APP, NAV } from '@/config/strings';
import { ADMIN_NAV_ITEMS } from '@/config/admin-strings';
import { ADMIN_EXIT_LINK_STYLE } from '@/config/admin-colors';
import { useGlobalSearch } from '../_hooks/useGlobalSearch';
import { SearchDropdown } from './SearchDropdown';

export function AdminNav() {
  const search = useGlobalSearch();
  const wrapperRef = useRef<HTMLDivElement>(null);

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
    <nav className="bg-slate-900 text-white px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center gap-6">
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-bold text-sm whitespace-nowrap">{APP.NAME} Admin</span>
          <Link href="/dashboard" className={ADMIN_EXIT_LINK_STYLE}>
            {NAV.EXIT_ADMIN}
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto flex-shrink-0">
          {ADMIN_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-gray-300 hover:text-white transition-colors whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div ref={wrapperRef} className="relative ml-auto w-full max-w-xs flex-shrink">
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
      </div>
    </nav>
  );
}
