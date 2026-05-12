import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { RATE_LIMITS } from '@/config/security';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  if (pathname.startsWith('/api/')) {
    const isAiEndpoint =
      pathname.includes('/questionnaire') || pathname.includes('/report');

    const windowMs = isAiEndpoint
      ? RATE_LIMITS.AI_ENDPOINT_WINDOW_MS
      : RATE_LIMITS.GLOBAL_WINDOW_MS;
    const maxReqs = isAiEndpoint
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
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/questionnaire/:path*',
    '/dashboard/:path*',
    '/api/:path*',
  ],
};
