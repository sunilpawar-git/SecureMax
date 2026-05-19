import { auth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { RATE_LIMITS } from '@/config/security';
import { USER_ROLE } from '@/config/strings';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

const PROTECTED_PAGE_PREFIXES = [
  '/questionnaire',
  '/dashboard',
  '/admin',
  '/payment',
  '/report',
  '/enterprise',
  '/onboarding',
];

function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGE_PREFIXES.some((p) => pathname.startsWith(p));
}

export default auth(async (req) => {
  const { nextUrl } = req;
  const { pathname } = nextUrl;
  const ip = getClientIp(req);

  // Generate or forward X-Request-ID for tracing
  const requestId =
    req.headers.get('x-request-id') || crypto.randomUUID();

  // Rate-limit API routes before auth checks.
  if (pathname.startsWith('/api/')) {
    // Defense-in-depth: block non-admin users from /api/admin/* at middleware layer
    if (pathname.startsWith('/api/admin')) {
      const session = req.auth;
      if (!session?.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401, headers: { 'X-Request-ID': requestId } },
        );
      }
      if ((session.user as { role?: string }).role !== USER_ROLE.ADMIN) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403, headers: { 'X-Request-ID': requestId } },
        );
      }
    }

    const isAiEndpoint = pathname.includes('/questionnaire') || pathname.includes('/report');
    const isAdminEndpoint = pathname.startsWith('/api/admin');

    const windowMs = isAdminEndpoint
      ? RATE_LIMITS.ADMIN_WINDOW_MS
      : isAiEndpoint
        ? RATE_LIMITS.AI_ENDPOINT_WINDOW_MS
        : RATE_LIMITS.GLOBAL_WINDOW_MS;
    const maxReqs = isAdminEndpoint
      ? RATE_LIMITS.ADMIN_MAX_REQUESTS
      : isAiEndpoint
        ? RATE_LIMITS.AI_ENDPOINT_MAX_REQUESTS
        : RATE_LIMITS.GLOBAL_MAX_REQUESTS;

    const result = checkRateLimit(`${ip}:${pathname}`, windowMs, maxReqs);
    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(result.resetMs / 1000)),
            'X-Request-ID': requestId,
          },
        },
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-Request-ID', requestId);
    return response;
  }

  const session = req.auth;
  const isLoggedIn = !!session?.user?.id;

  // H-1: Redirect unauthenticated users away from protected page routes.
  if (isProtectedPage(pathname) && !isLoggedIn) {
    const signInUrl = new URL('/auth/signin', nextUrl);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // H-2: Require DPDPA consent before accessing any protected app route.
  // Excludes /onboarding/consent itself to avoid redirect loop.
  // Security headers are set in next.config.ts (SSOT) — not here.
  const CONSENT_REQUIRED_PREFIXES = [
    '/questionnaire',
    '/dashboard',
    '/payment',
    '/report',
    '/enterprise',
    '/admin',
  ];

  if (isLoggedIn) {
    // Guard admin pages to admin-role users only.
    if (pathname.startsWith('/admin') && (session.user as { role?: string }).role !== USER_ROLE.ADMIN) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    const requiresConsent = CONSENT_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p));
    const isConsentPage = pathname.startsWith('/onboarding/consent');
    if (requiresConsent && !isConsentPage) {
      const consentAt = (session as { user: { consentAt?: string } }).user.consentAt;
      if (!consentAt) {
        return NextResponse.redirect(new URL('/onboarding/consent', nextUrl));
      }
    }
  }

  const response = NextResponse.next();
  response.headers.set('X-Request-ID', requestId);
  return response;
});

export const config = {
  matcher: [
    '/admin/:path*',
    '/questionnaire/:path*',
    '/dashboard/:path*',
    '/payment/:path*',
    '/report/:path*',
    '/enterprise/:path*',
    '/onboarding/:path*',
    '/api/:path*',
  ],
};
