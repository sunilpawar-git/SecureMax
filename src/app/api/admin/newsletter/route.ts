/**
 * Admin newsletter endpoints — list, generate (proxy to FastAPI), job status poll,
 * soft-delete. Image bytes never travel through the list; previews use the dedicated
 * image routes. Deletes are status flips (Rule 15 — rows are never destroyed).
 *
 * Vercel note: only short proxy calls live here (<10 s). Newsletter synthesis runs
 * on persistent FastAPI; the admin UI polls GET ?action=status until the job completes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { aiServiceFetch, AIServiceError } from '@/lib/ai-service';
import { logAdminAction } from '@/lib/admin/actions';
import {
  ADMIN_ACTION_TYPE,
  ADMIN_ENTITY_TYPE,
  ADMIN_ERR,
  NEWSLETTER_PLATFORMS,
  NEWSLETTER_STATUS,
  NEWSLETTER_STRINGS,
} from '@/config/admin-strings';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { getPublisher } from '@/lib/social';

const LIST_LIMIT = 50;

interface DraftResponse {
  job_id?: string;
  newsletter_id?: string;
  title?: string;
  status?: string;
  message?: string;
}

interface JobStatusResponse {
  job_id: string;
  status: string;
  newsletter_id?: string | null;
  title?: string | null;
  error_message?: string | null;
}

/** GET /api/admin/newsletter — list drafts, or ?action=status&jobId= poll. */
export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) return forbiddenResponse();

  const action = request.nextUrl.searchParams.get('action');
  if (action === 'status') {
    const jobId = request.nextUrl.searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
    }
    try {
      const result = await aiServiceFetch<JobStatusResponse>(
        `/newsletter/jobs/${encodeURIComponent(jobId)}`,
        { method: 'GET' },
      );
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof AIServiceError) {
        const clientStatus = error.statusCode >= 500 ? 503 : error.statusCode;
        return NextResponse.json({ error: error.message }, { status: clientStatus });
      }
      return NextResponse.json({ error: NEWSLETTER_STRINGS.ERR_GENERATE }, { status: 503 });
    }
  }

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

  const configured: Record<string, boolean> = {};
  await Promise.all(
    NEWSLETTER_PLATFORMS.map(async (platform) => {
      configured[platform] = (await getPublisher(platform)?.isConfigured()) ?? false;
    }),
  );

  return NextResponse.json({ newsletters, configured });
}

/** POST /api/admin/newsletter?action=generate — enqueue draft on FastAPI. */
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
    });

    if (result.job_id) {
      await logAdminAction({
        adminId: session.user.id,
        actionType: ADMIN_ACTION_TYPE.NEWSLETTER_GENERATED,
        entityType: ADMIN_ENTITY_TYPE.NEWSLETTER,
        entityId: result.job_id,
        metadata: { async: true, days: 7, status: result.status },
      });
    } else if (result.newsletter_id) {
      await logAdminAction({
        adminId: session.user.id,
        actionType: ADMIN_ACTION_TYPE.NEWSLETTER_GENERATED,
        entityType: ADMIN_ENTITY_TYPE.NEWSLETTER,
        entityId: result.newsletter_id,
        metadata: { title: result.title },
      });
    }

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
    const existing = await prisma.newsletter.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: NEWSLETTER_STRINGS.ERR_NOT_FOUND }, { status: 404 });
    }
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
