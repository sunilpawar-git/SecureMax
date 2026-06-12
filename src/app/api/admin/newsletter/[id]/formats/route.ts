/**
 * Admin-gated format download for newsletter outputs (email HTML, WhatsApp
 * plain text). The PNG image has its own route at ../image/route.ts; website
 * HTML is publicly served at /intelligence.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { NEWSLETTER_STATUS, NEWSLETTER_STRINGS } from '@/config/admin-strings';
import { prisma } from '@/lib/prisma';

const FormatType = z.enum(['email', 'whatsapp']);

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdmin())) return forbiddenResponse();

  const typeParam = request.nextUrl.searchParams.get('type');
  const parsed = FormatType.safeParse(typeParam);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid type — use email or whatsapp' }, { status: 400 });
  }
  const fmt = parsed.data;

  const { id } = await params;
  const newsletter = await prisma.newsletter.findUnique({
    where: { id },
    select: { status: true, emailHtml: true, whatsappText: true },
  });

  if (!newsletter || newsletter.status === NEWSLETTER_STATUS.DELETED) {
    return NextResponse.json({ error: NEWSLETTER_STRINGS.ERR_NOT_FOUND }, { status: 404 });
  }

  const content = fmt === 'email' ? newsletter.emailHtml : newsletter.whatsappText;
  if (!content) {
    return NextResponse.json({ error: 'Format not available' }, { status: 404 });
  }

  if (fmt === 'whatsapp') {
    return NextResponse.json(
      { text: content },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store',
    },
  });
}
