/**
 * Admin LinkedIn post draft endpoint.
 * Proxies to FastAPI /linkedin/draft for Gemini-powered draft generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { aiServiceFetch, AIServiceError } from '@/lib/ai-service';
import { logAdminAction } from '@/lib/admin/actions';
import { LinkedInDraftSchema } from '@/lib/admin/validators';
import { handlePublish, PublishSchema } from './publish';
import {
  ADMIN_ACTION_TYPE,
  ADMIN_ENTITY_TYPE,
  ADMIN_ERR,
  LINKEDIN_POST_STATUS,
  LINKEDIN_STRINGS,
} from '@/config/admin-strings';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const LogPostSchema = z.object({ postText: z.string().min(1).max(3000) });
const PatchStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['published', 'draft']),
});

/** GET /api/admin/linkedin?type=drafts — list draft posts. */
export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) return forbiddenResponse();

  const type = request.nextUrl.searchParams.get('type');
  if (type !== 'drafts') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  try {
    const posts = await prisma.linkedinPost.findMany({
      where: { status: { in: ['draft', 'copied'] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const mapped = posts.map((p) => ({
      id: p.id,
      postText: p.draftText,
      status: p.status === 'draft' ? 'draft' : 'published',
      createdAt: p.createdAt.toISOString(),
    }));
    return NextResponse.json({ posts: mapped });
  } catch (err) {
    logger.error('Failed to fetch drafts', 'linkedin-route', { detail: String(err) });
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
  }
}

/** PATCH /api/admin/linkedin — publish (action: "publish") or update draft status. */
export async function PATCH(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
  }

  if (typeof raw === 'object' && raw !== null && 'action' in raw) {
    const publishParsed = PublishSchema.safeParse(raw);
    if (!publishParsed.success) {
      return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
    }
    return handlePublish(session.user.id, publishParsed.data);
  }

  const parsed = PatchStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
  }

  try {
    await prisma.linkedinPost.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
    });
    await logAdminAction({
      adminId: session.user.id,
      actionType: ADMIN_ACTION_TYPE.LINKEDIN_POST_STATUS_CHANGED,
      entityType: ADMIN_ENTITY_TYPE.LINKEDIN_POST,
      entityId: parsed.data.id,
      metadata: { newStatus: parsed.data.status },
    });
    return NextResponse.json({ updated: true });
  } catch (err) {
    logger.error('Failed to update post status', 'linkedin-route', { detail: String(err) });
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) {
    return forbiddenResponse();
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
  }

  const parsed = LinkedInDraftSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
  }

  try {
    const result = await aiServiceFetch<{ post_text?: string; hashtags?: string[] }>(
      '/linkedin/draft',
      { body: parsed.data },
    );

    let draftId: string | null = null;
    if (result.post_text) {
      const fullText = result.hashtags?.length
        ? `${result.post_text}\n\n${result.hashtags.join(' ')}`
        : result.post_text;
      const draft = await prisma.linkedinPost.create({
        data: {
          draftText: fullText,
          status: 'draft',
          platform: 'linkedin',
          postedByAdmin: session.user.id,
        },
      });
      draftId = draft.id;
    }

    return NextResponse.json({ ...result, draftId });
  } catch (error) {
    if (error instanceof AIServiceError) {
      logger.error('AI service error', 'linkedin-route', {
        status: error.statusCode,
      });
      const clientStatus = error.statusCode >= 500 ? 503 : error.statusCode;
      return NextResponse.json(
        {
          error: LINKEDIN_STRINGS.DRAFT_UPSTREAM_ERROR.replace(
            '{status}',
            String(error.statusCode),
          ),
        },
        { status: clientStatus },
      );
    }
    logger.error('Unexpected error', 'linkedin-route');
    return NextResponse.json({ error: 'LinkedIn draft service unavailable' }, { status: 503 });
  }
}

/** DELETE /api/admin/linkedin?id=X — soft-delete a draft (status = "deleted"). */
export async function DELETE(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
  }

  try {
    await prisma.linkedinPost.update({
      where: { id },
      data: { status: LINKEDIN_POST_STATUS.DELETED },
    });
    await logAdminAction({
      adminId: session.user.id,
      actionType: ADMIN_ACTION_TYPE.LINKEDIN_POST_DELETED,
      entityType: ADMIN_ENTITY_TYPE.LINKEDIN_POST,
      entityId: id,
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    logger.error('Failed to delete draft', 'linkedin-route', { detail: String(err) });
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

/** PUT /api/admin/linkedin — log copied post to LinkedinPost table (audit trail). */
export async function PUT(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
  }

  const parsed = LogPostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
  }

  try {
    const post = await prisma.linkedinPost.create({
      data: {
        draftText: parsed.data.postText,
        status: 'copied',
        platform: 'linkedin',
        postedByAdmin: session.user.id,
      },
    });
    await logAdminAction({
      adminId: session.user.id,
      actionType: ADMIN_ACTION_TYPE.LINKEDIN_POST_COPIED,
      entityType: ADMIN_ENTITY_TYPE.LINKEDIN_POST,
      entityId: post.id,
    });
    return NextResponse.json({ logged: true });
  } catch (err) {
    logger.error('Failed to log LinkedIn post', 'linkedin-route', { detail: String(err) });
    return NextResponse.json({ error: 'Failed to log post' }, { status: 500 });
  }
}
