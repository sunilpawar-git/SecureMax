/**
 * Per-platform newsletter publishing.
 * Every attempt — success or failure — is recorded as a NewsletterPost row
 * (Rule 15). A platform already marked posted is never attempted again.
 * First success flips the newsletter to published, which also activates the
 * public image URL needed by URL-based platforms.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { logAdminAction } from '@/lib/admin/actions';
import { getPublisher } from '@/lib/social';
import type { SocialPublishResult } from '@/lib/social';
import {
  ADMIN_ACTION_TYPE,
  ADMIN_ENTITY_TYPE,
  ADMIN_ERR,
  NEWSLETTER_PLATFORMS,
  NEWSLETTER_POST_STATUS,
  NEWSLETTER_STATUS,
  type NewsletterPlatform,
} from '@/config/admin-strings';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

const PublishSchema = z.object({
  platforms: z.array(z.enum(NEWSLETTER_PLATFORMS)).min(1),
  captions: z.record(z.string(), z.string().max(3000)).optional(),
});

const ERR_ALREADY_POSTED = 'Already posted to this platform';
const ERR_NOT_CONFIGURED = 'Platform is not configured — add its API keys first';

async function recordAttempt(
  newsletterId: string,
  platform: NewsletterPlatform,
  caption: string,
  adminId: string,
  result: SocialPublishResult,
): Promise<void> {
  const posted = result.success;
  const data = {
    caption,
    status: posted ? NEWSLETTER_POST_STATUS.POSTED : NEWSLETTER_POST_STATUS.FAILED,
    externalId: result.externalId ?? null,
    errorMsg: result.error ?? null,
    postedAt: posted ? new Date() : null,
    postedByAdmin: adminId,
  };
  await prisma.newsletterPost.upsert({
    where: { newsletterId_platform: { newsletterId, platform } },
    create: { newsletterId, platform, ...data },
    update: data,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  const { id } = await params;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
  }
  const parsed = PublishSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
  }

  const newsletter = await prisma.newsletter.findUnique({ where: { id } });
  if (!newsletter || newsletter.status === NEWSLETTER_STATUS.DELETED || !newsletter.imagePng) {
    return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
  }

  const imageUrl = `${env.NEXTAUTH_URL}/api/newsletter/${id}/image`;
  const results: Record<string, SocialPublishResult> = {};
  let anySuccess = false;

  for (const platform of parsed.data.platforms) {
    const caption = parsed.data.captions?.[platform] || newsletter.title;

    const existing = await prisma.newsletterPost.findUnique({
      where: { newsletterId_platform: { newsletterId: id, platform } },
    });
    if (existing?.status === NEWSLETTER_POST_STATUS.POSTED) {
      results[platform] = { success: false, error: ERR_ALREADY_POSTED };
      continue;
    }

    const publisher = getPublisher(platform);
    if (!publisher || !(await publisher.isConfigured())) {
      results[platform] = { success: false, error: ERR_NOT_CONFIGURED };
      continue;
    }

    const result = await publisher.publish({
      caption,
      imagePng: Buffer.from(newsletter.imagePng),
      imageUrl,
    });
    results[platform] = result;
    anySuccess = anySuccess || result.success;

    await recordAttempt(id, platform, caption, session.user.id, result);
    await logAdminAction({
      adminId: session.user.id,
      actionType: ADMIN_ACTION_TYPE.NEWSLETTER_PUBLISHED,
      entityType: ADMIN_ENTITY_TYPE.NEWSLETTER,
      entityId: id,
      metadata: { platform, success: result.success, externalId: result.externalId ?? null },
    });
  }

  if (anySuccess && newsletter.status !== NEWSLETTER_STATUS.PUBLISHED) {
    await prisma.newsletter.update({
      where: { id },
      data: { status: NEWSLETTER_STATUS.PUBLISHED },
    });
  }

  logger.info('Newsletter publish completed', 'newsletter-publish', {
    newsletterId: id,
    platforms: parsed.data.platforms.join(','),
  });
  return NextResponse.json({ results });
}
