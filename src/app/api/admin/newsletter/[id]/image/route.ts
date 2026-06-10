/**
 * Admin preview image for newsletters of ANY status (drafts included).
 * The public route (/api/newsletter/[id]/image) serves published issues only;
 * this one is admin-gated for pre-publish review.
 */

import { NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin())) return forbiddenResponse();

  const { id } = await params;
  const newsletter = await prisma.newsletter.findUnique({
    where: { id },
    select: { imagePng: true },
  });

  if (!newsletter?.imagePng) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return new NextResponse(Buffer.from(newsletter.imagePng), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
    },
  });
}
