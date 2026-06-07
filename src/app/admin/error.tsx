'use client';

/**
 * Admin error boundary — catches rendering errors in admin pages.
 */

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AdminError]', error.digest ?? error.message);
    }
  }, [error]);
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md text-center">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">An unexpected error occurred.</p>
        <button
          onClick={reset}
          className="text-sm px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
