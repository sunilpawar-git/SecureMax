'use client';

/**
 * Global app header — two variants:
 * - "full": logo, nav links, admin link (if admin), sign out (dashboard/report/enterprise pages)
 * - "slim": logo + track badge + "Question N" + Save & Exit (questionnaire pages)
 *
 * Desktop shows inline nav; mobile collapses nav into a MobileNavDrawer behind a
 * hamburger. Progress props (track/questionNumber) are supplied by AppLayoutShell
 * from the AppHeader context (set by the questionnaire client).
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { APP, NAV, USER_ROLE, NAV_DRAWER, QUESTIONNAIRE, TRACK_LABEL } from '@/config/strings';
import { HEADER_STYLES } from '@/config';
import { MobileNavDrawer, type NavDrawerItem } from './MobileNavDrawer';
import { Badge } from './ui/Badge';

export type HeaderVariant = 'full' | 'slim';

interface AppHeaderProps {
  variant: HeaderVariant;
  track?: string | null;
  questionNumber?: number | null;
}

const NAV_LINK =
  'text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors';

export function AppHeader({ variant, track, questionNumber }: AppHeaderProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === USER_ROLE.ADMIN;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSignOut = () => signOut({ callbackUrl: '/' });
  const handleSaveAndExit = () => router.push('/dashboard');

  const items: NavDrawerItem[] =
    variant === 'full'
      ? [
          { label: NAV.DASHBOARD, href: '/dashboard' },
          { label: NAV.START_AUDIT, href: '/questionnaire' },
          ...(isAdmin ? [{ label: 'Admin Panel', href: '/admin', emphasis: true }] : []),
          { label: NAV.SIGN_OUT, onClick: handleSignOut },
        ]
      : [{ label: NAV.SAVE_EXIT, onClick: handleSaveAndExit }];

  return (
    <header className={`${HEADER_STYLES[variant]} h-12 flex items-center px-4 shrink-0`}>
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-300"
          >
            {APP.NAME}
          </Link>
          {variant === 'slim' && track && (
            <Badge variant={track === 'enterprise' ? 'slate' : 'emerald'}>
              {TRACK_LABEL[track] ?? track}
            </Badge>
          )}
          {variant === 'slim' && questionNumber != null && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {QUESTIONNAIRE.QUESTION_LABEL} {questionNumber}
            </span>
          )}
        </div>

        {/* Desktop nav */}
        {variant === 'full' ? (
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/dashboard" className={NAV_LINK}>
              {NAV.DASHBOARD}
            </Link>
            <Link href="/questionnaire" className={NAV_LINK}>
              {NAV.START_AUDIT}
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
              >
                Admin Panel
              </Link>
            )}
            <button onClick={handleSignOut} className={NAV_LINK}>
              {NAV.SIGN_OUT}
            </button>
          </nav>
        ) : (
          <button onClick={handleSaveAndExit} className={`hidden md:inline-block ${NAV_LINK}`}>
            {NAV.SAVE_EXIT}
          </button>
        )}

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={NAV_DRAWER.OPEN}
          className="md:hidden rounded-lg p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      <MobileNavDrawer items={items} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
