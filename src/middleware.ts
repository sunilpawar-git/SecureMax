import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/questionnaire', '/report', '/dashboard', '/onboarding', '/payment'];

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user?.id;

  // H-1: Redirect unauthenticated users away from protected routes.
  const isProtected = PROTECTED_PREFIXES.some((p) => nextUrl.pathname.startsWith(p));
  if (isProtected && !isLoggedIn) {
    const signInUrl = new URL('/auth/signin', nextUrl);
    signInUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  // H-2: Enforce DPDPA consent before the questionnaire.
  // Security headers are set in next.config.ts (SSOT) — not here.
  if (nextUrl.pathname.startsWith('/questionnaire') && isLoggedIn) {
    const consentAt = (session as { user: { consentAt?: string } }).user.consentAt;
    if (!consentAt) {
      return NextResponse.redirect(new URL('/onboarding/consent', nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
