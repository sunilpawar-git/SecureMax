/**
 * Admin newsletter endpoints — list, generate (proxy to FastAPI), soft-delete.
 * Image bytes never travel through the list; previews use the dedicated
 * image routes. Deletes are status flips (Rule 15 — rows are never destroyed).
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { aiServiceFetch, AIServiceError } from '@/lib/ai-service';
import { logAdminAction } from '@/lib/admin/actions';
import {
  ADMIN_ACTION_TYPE,
  ADMIN_ENTITY_TYPE,
  ADMIN_ERR,
  NEWSLETTER_STATUS,
  NEWSLETTER_STRINGS,
} from '@/config/admin-strings';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { getPublisher } from '@/lib/social';
import { NEWSLETTER_PLATFORMS } from '@/config/admin-strings';

const LIST_LIMIT = 50;
const GENERATE_TIMEOUT_MS = 60_000; // Gemini synthesis + Playwright render

interface DraftResponse {
  newsletter_id: string;
  title: string;
}

/** GET /api/admin/newsletter — newest first, no image bytes. */
export async function GET() {
  if (!(await verifyAdmin())) return forbiddenResponse();

  const newsletters = await prisma.newsletter.findMany({
    where: { status: { not: NEWSLETTER_STATUS.DELETED } },
    select: {
      id: true,
      title: true,
      status: true,
      articleIds: true,
      createdAt: true,
      posts: {
        select: { platform: true, status: true, postedAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: LIST_LIMIT,
  });

  // Which platforms have working keys — booleans only, never key data
  const configured: Record<string, boolean> = {};
  await Promise.all(
    NEWSLETTER_PLATFORMS.map(async (platform) => {
      configured[platform] = (await getPublisher(platform)?.isConfigured()) ?? false;
    }),
  );

  return NextResponse.json({ newsletters, configured });
}

/** POST /api/admin/newsletter?action=generate — draft now via the AI service. */
export async function POST(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  if (request.nextUrl.searchParams.get('action') !== 'generate') {
    return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
  }

  try {
    const result = await aiServiceFetch<DraftResponse>('/newsletter/draft', {
      method: 'POST',
      body: { days: 7 },
      timeoutMs: GENERATE_TIMEOUT_MS,
    });

    await logAdminAction({
      adminId: session.user.id,
      actionType: ADMIN_ACTION_TYPE.NEWSLETTER_GENERATED,
      entityType: ADMIN_ENTITY_TYPE.NEWSLETTER,
      entityId: result.newsletter_id,
      metadata: { title: result.title },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AIServiceError) {
      logger.error('Newsletter generation failed', 'newsletter-route', {
        status: error.statusCode,
      });
      const clientStatus = error.statusCode >= 500 ? 503 : error.statusCode;
      return NextResponse.json({ error: error.message }, { status: clientStatus });
    }
    logger.error('Newsletter generation error', 'newsletter-route', { detail: String(error) });
    return NextResponse.json({ error: NEWSLETTER_STRINGS.ERR_GENERATE }, { status: 503 });
  }
}

/** DELETE /api/admin/newsletter?id= — soft-delete (status flip only). */
export async function DELETE(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
  }

  try {
    await prisma.newsletter.update({
      where: { id },
      data: { status: NEWSLETTER_STATUS.DELETED },
    });
    await logAdminAction({
      adminId: session.user.id,
      actionType: ADMIN_ACTION_TYPE.NEWSLETTER_DELETED,
      entityType: ADMIN_ENTITY_TYPE.NEWSLETTER,
      entityId: id,
    });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    logger.error('Newsletter delete failed', 'newsletter-route', { detail: String(error) });
    return NextResponse.json({ error: NEWSLETTER_STRINGS.ERR_DELETE }, { status: 500 });
  }
}
