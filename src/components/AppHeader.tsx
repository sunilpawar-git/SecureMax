'use client';

/**
 * Global app header — two variants:
 * - "full": logo, nav links, sign out (dashboard/report/enterprise pages)
 * - "slim": logo + Save & Exit (questionnaire pages)
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { APP, NAV } from '@/config/strings';
import { HEADER_STYLES } from '@/config/admin-colors';

export type HeaderVariant = 'full' | 'slim';

interface AppHeaderProps {
  variant: HeaderVariant;
}

export function AppHeader({ variant }: AppHeaderProps) {
  const router = useRouter();

  const handleSaveAndExit = () => {
    router.push('/dashboard');
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <header className={`${HEADER_STYLES[variant]} h-12 flex items-center px-4 shrink-0`}>
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
        <Link href="/dashboard" className="text-sm font-bold text-slate-900 hover:text-slate-700">
          {APP.NAME}
        </Link>

        {variant === 'full' ? (
          <nav className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              {NAV.DASHBOARD}
            </Link>
            <Link
              href="/questionnaire"
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              {NAV.START_AUDIT}
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              {NAV.SIGN_OUT}
            </button>
          </nav>
        ) : (
          <button
            onClick={handleSaveAndExit}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            {NAV.SAVE_EXIT}
          </button>
        )}
      </div>
    </header>
  );
}
