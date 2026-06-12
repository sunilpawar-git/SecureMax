/**
 * Public image endpoint for newsletters (draft or published).
 * Instagram/Facebook publishing requires a publicly fetchable image URL —
 * this is the only reason the route is unauthenticated. Deleted newsletters
 * are indistinguishable from missing ones (404). Draft images are served
 * because URL-based platforms (Meta) fetch the image during the publish
 * flow, before status flips to published.
 *
 * Rate-limited to prevent abuse (public, unauthenticated).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NEWSLETTER_STATUS } from '@/config/admin-strings';
import { checkRateLimit } from '@/lib/rate-limit';

const IMAGE_CACHE_SECONDS = 3600;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = await checkRateLimit(`newsletter-image:${ip}`, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const newsletter = await prisma.newsletter.findUnique({
    where: { id },
    select: { status: true, imagePng: true },
  });

  if (!newsletter || newsletter.status === NEWSLETTER_STATUS.DELETED || !newsletter.imagePng) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const cacheHeader =
    newsletter.status === NEWSLETTER_STATUS.PUBLISHED
      ? `public, max-age=${IMAGE_CACHE_SECONDS}`
      : 'private, no-store';

  return new NextResponse(Buffer.from(newsletter.imagePng), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': cacheHeader,
    },
  });
}
