'use client';

/**
 * Client-side layout shell for the (app) route group.
 * Determines header variant based on current pathname.
 * Slim header on /questionnaire (distraction-free); full header elsewhere.
 */

import { usePathname } from 'next/navigation';
import { AppHeader } from './AppHeader';
import type { HeaderVariant } from './AppHeader';

interface AppLayoutShellProps {
  children: React.ReactNode;
}

function getHeaderVariant(pathname: string): HeaderVariant {
  if (pathname.startsWith('/questionnaire')) return 'slim';
  return 'full';
}

export function AppLayoutShell({ children }: AppLayoutShellProps) {
  const pathname = usePathname();
  const variant = getHeaderVariant(pathname);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader variant={variant} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
