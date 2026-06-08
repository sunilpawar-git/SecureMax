'use client';

/**
 * Public landing page header — no session, no auth knowledge.
 * Separate from AppHeader (which is for authenticated (app) routes).
 *
 * Client component (unavoidable): owns the mobile drawer open/close state so it
 * can reuse the presentational MobileNavDrawer (assertion #6). It passes its own
 * `items` (just Sign In — public, no track param) and holds no auth logic itself.
 *
 * Responsibilities (SRP):
 * - Show brand logo linking to /
 * - Desktop: inline "Sign In" link
 * - Mobile: hamburger → MobileNavDrawer with the same Sign In link
 */
import { useState } from 'react';
import Link from 'next/link';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { APP, NAV, NAV_DRAWER } from '@/config/strings';
import { LANDING_HEADER_STYLES } from '@/config/colors';
import { MobileNavDrawer, type NavDrawerItem } from '@/components/MobileNavDrawer';

export function LandingHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const items: NavDrawerItem[] = [{ label: NAV.SIGN_IN, href: '/auth/signin', emphasis: true }];

  return (
    <header className={LANDING_HEADER_STYLES.header}>
      <div className={LANDING_HEADER_STYLES.nav}>
        <Link href="/" className={LANDING_HEADER_STYLES.logo}>
          {APP.NAME}
        </Link>

        {/* Desktop sign-in */}
        <Link
          href="/auth/signin"
          className={`hidden md:inline-block ${LANDING_HEADER_STYLES.signInLink}`}
        >
          {NAV.SIGN_IN}
        </Link>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={NAV_DRAWER.OPEN}
          className="md:hidden rounded-lg p-2.5 text-white hover:bg-white/10"
        >
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      <MobileNavDrawer items={items} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
