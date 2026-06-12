/**
 * Publish handler for PATCH /api/admin/linkedin (action: "publish").
 * Split from route.ts to honor the 300-line cap. Publishes to the company
 * page via the LinkedIn Posts API, then persists status with a double-post
 * guard and a loud bookkeeping-failure path.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logAdminAction } from '@/lib/admin/actions';
import { publishToLinkedIn } from '@/lib/admin/linkedin-post-service';
import {
  ADMIN_ACTION_TYPE,
  ADMIN_ENTITY_TYPE,
  ADMIN_ERR,
  LINKEDIN_POST_STATUS,
  LINKEDIN_STRINGS,
} from '@/config/admin-strings';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export const PublishSchema = z.object({
  action: z.literal('publish'),
  id: z.string().min(1).optional(), // absent = ad-hoc text not yet in DB
  postText: z.string().min(1).max(3000),
});

/** Publish to the company page via the LinkedIn Posts API, then persist. */
export async function handlePublish(
  adminId: string,
  input: z.infer<typeof PublishSchema>,
): Promise<NextResponse> {
  // Double-post guard: a draft that is already live must never be re-published
  // (e.g. after a prior publish whose DB bookkeeping failed).
  if (input.id) {
    const existing = await prisma.linkedinPost.findUnique({ where: { id: input.id } });
    if (!existing) {
      return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 404 });
    }
    if (existing.status === LINKEDIN_POST_STATUS.POSTED) {
      return NextResponse.json({ error: LINKEDIN_STRINGS.ALREADY_POSTED }, { status: 409 });
    }
  }

  const result = await publishToLinkedIn(input.postText);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? LINKEDIN_STRINGS.POST_ERROR },
      { status: 502 },
    );
  }

  const data = {
    finalText: input.postText,
    status: LINKEDIN_POST_STATUS.POSTED,
    postedAt: new Date(),
    postedByAdmin: adminId,
  };

  // The post IS live on LinkedIn from here on. Persist with one retry so the
  // queue cannot keep showing it as an innocent draft and invite a double post.
  let post: { id: string } | null = null;
  for (let attempt = 0; attempt < 2 && !post; attempt++) {
    try {
      post = input.id
        ? await prisma.linkedinPost.update({ where: { id: input.id }, data })
        : await prisma.linkedinPost.create({
            data: { ...data, draftText: input.postText, platform: 'linkedin' },
          });
    } catch (err) {
      if (attempt === 1) {
        logger.error('Post published but DB update failed', 'linkedin-route', {
          detail: String(err),
          linkedinPostId: result.linkedinPostId ?? 'unknown',
        });
      }
    }
  }
  if (!post) {
    // Surface the bookkeeping failure loudly — the UI must warn before reposting
    return NextResponse.json({
      posted: true,
      linkedinPostId: result.linkedinPostId ?? null,
      bookkeepingFailed: true,
    });
  }

  try {
    await logAdminAction({
      adminId,
      actionType: ADMIN_ACTION_TYPE.LINKEDIN_POST_PUBLISHED,
      entityType: ADMIN_ENTITY_TYPE.LINKEDIN_POST,
      entityId: post.id,
      metadata: { linkedinPostId: result.linkedinPostId ?? null },
    });
  } catch (err) {
    logger.error('Post published but audit log failed', 'linkedin-route', {
      detail: String(err),
      linkedinPostId: result.linkedinPostId ?? 'unknown',
    });
  }
  return NextResponse.json({ posted: true, linkedinPostId: result.linkedinPostId ?? null });
}
