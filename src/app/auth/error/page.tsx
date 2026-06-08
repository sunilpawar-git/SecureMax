import Link from 'next/link';
import { APP, AUTH, AUTH_ERROR_MESSAGES } from '@/config/strings';
import { BUTTON_STYLES } from '@/config/colors';
import { cx } from '@/lib/utils';

interface ErrorPageProps {
  searchParams: Promise<{ error?: string }>;
}

// "Try again" is a navigation (Link), not a form action, so it can't use the
// Button primitive (a <button>); it pulls the same SSOT tokens via BUTTON_STYLES.
const TRY_AGAIN_LINK = cx(
  BUTTON_STYLES.base,
  BUTTON_STYLES.variant.primary,
  BUTTON_STYLES.size.lg,
  'w-full',
);

export default async function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const params = await searchParams;
  const errorCode = params.error ?? 'Default';
  const message = AUTH_ERROR_MESSAGES[errorCode] ?? AUTH_ERROR_MESSAGES.Default;

  return (
    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-800 p-8 shadow-sm text-center space-y-4">
      <div className="mx-auto w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
        <svg
          className="w-6 h-6 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
      </div>

      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {AUTH.ERROR_TITLE}
      </h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>

      <div className="pt-2 space-y-2">
        <Link href="/auth/signin" className={TRY_AGAIN_LINK}>
          {AUTH.ERROR_TRY_AGAIN}
        </Link>
        <Link
          href="/"
          className="block text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          {AUTH.ERROR_BACK_PREFIX} {APP.NAME}
        </Link>
      </div>
    </div>
  );
}
