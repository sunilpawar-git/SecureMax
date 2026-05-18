import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const CONSENT_REQUIRED_PREFIXES = [
  '/questionnaire',
  '/dashboard',
  '/payment',
  '/report',
  '/enterprise',
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// Re-usable server-side consent gate — called by page-level server components
// that sit behind the consent wall. Checks DB directly so it's never stale.
export async function requireConsent(pathname: string) {
  const needsConsent = CONSENT_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!needsConsent) return;

  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { consentAt: true },
  });

  if (!user?.consentAt) {
    redirect('/onboarding/consent');
  }
}
