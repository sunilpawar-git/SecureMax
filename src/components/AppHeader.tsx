'use client';

/**
 * Global app header — two variants:
 * - "full": logo, nav links, admin link (if admin), sign out (dashboard/report/enterprise pages)
 * - "slim": logo + Save & Exit (questionnaire pages)
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { APP, NAV, USER_ROLE } from '@/config/strings';
import { HEADER_STYLES } from '@/config';

export type HeaderVariant = 'full' | 'slim';

interface AppHeaderProps {
  variant: HeaderVariant;
}

export function AppHeader({ variant }: AppHeaderProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === USER_ROLE.ADMIN;

  const handleSaveAndExit = () => {
    router.push('/dashboard');
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <header className={`${HEADER_STYLES[variant]} h-12 flex items-center px-4 shrink-0`}>
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-300"
        >
          {APP.NAME}
        </Link>

        {variant === 'full' ? (
          <nav className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              {NAV.DASHBOARD}
            </Link>
            <Link
              href="/questionnaire"
              className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
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
            <button
              onClick={handleSignOut}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              {NAV.SIGN_OUT}
            </button>
          </nav>
        ) : (
          <button
            onClick={handleSaveAndExit}
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            {NAV.SAVE_EXIT}
          </button>
        )}
      </div>
    </header>
  );
}
