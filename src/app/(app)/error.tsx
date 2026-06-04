'use client';

import { useEffect } from 'react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AppError]', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-500"
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
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Something went wrong</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          An unexpected error occurred. Our team has been notified.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
