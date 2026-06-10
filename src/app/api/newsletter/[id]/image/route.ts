/**
 * Public image endpoint for published newsletters.
 * Instagram/Facebook publishing requires a publicly fetchable image URL —
 * this is the only reason the route is unauthenticated. It therefore serves
 * PUBLISHED issues only; drafts and deleted issues are indistinguishable
 * from missing ones (404).
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NEWSLETTER_STATUS } from '@/config/admin-strings';

const IMAGE_CACHE_SECONDS = 3600;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const newsletter = await prisma.newsletter.findUnique({
    where: { id },
    select: { status: true, imagePng: true },
  });

  if (
    !newsletter ||
    newsletter.status !== NEWSLETTER_STATUS.PUBLISHED ||
    !newsletter.imagePng
  ) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return new NextResponse(Buffer.from(newsletter.imagePng), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': `public, max-age=${IMAGE_CACHE_SECONDS}`,
    },
  });
}
