import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { RATE_LIMITS } from '@/config/security';
import { auth } from '@/lib/auth';

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
];

function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGE_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  if (pathname.startsWith('/api/')) {
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
          headers: { 'Retry-After': String(Math.ceil(result.resetMs / 1000)) },
        },
      );
    }

    return NextResponse.next();
  }

  if (isProtectedPage(pathname)) {
    const session = await auth();

    if (!session?.user) {
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    if (pathname.startsWith('/admin') && (session.user as { role?: string }).role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Note: DPDPA consent gate is enforced at the page/layout level (server components),
    // not here — the JWT consentAt field can be stale until the next re-login.
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/questionnaire/:path*',
    '/dashboard/:path*',
    '/payment/:path*',
    '/report/:path*',
    '/enterprise/:path*',
    '/api/:path*',
  ],
};
