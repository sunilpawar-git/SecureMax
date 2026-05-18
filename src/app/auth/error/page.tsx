import Link from 'next/link';
import { APP } from '@/config/strings';

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification link may have expired or already been used.',
  Default: 'An unexpected authentication error occurred.',
  OAuthSignin: 'Could not start the sign-in process. Please try again.',
  OAuthCallback: 'Sign-in was interrupted. Please try again.',
  OAuthAccountNotLinked: 'This email is already linked to another sign-in method.',
};

interface ErrorPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const params = await searchParams;
  const errorCode = params.error ?? 'Default';
  const message = ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default;

  return (
    <div className="rounded-xl border border-red-200 bg-white p-8 shadow-sm text-center space-y-4">
      <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <svg
          className="w-6 h-6 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
      </div>

      <h2 className="text-lg font-semibold text-slate-900">Authentication Error</h2>
      <p className="text-sm text-slate-600">{message}</p>

      <div className="pt-2 space-y-2">
        <Link
          href="/auth/signin"
          className="block w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
        >
          Try again
        </Link>
        <Link
          href="/"
          className="block text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          Back to {APP.NAME}
        </Link>
      </div>
    </div>
  );
}
