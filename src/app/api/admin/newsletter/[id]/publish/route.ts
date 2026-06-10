/**
 * Per-platform newsletter publishing.
 * Every attempt — success or failure — is recorded as an append-only
 * NewsletterPost row (Rule 15: audit trail is sacred, never overwritten).
 * A platform already marked posted is never attempted again.
 *
 * Publish order: status is flipped to "published" BEFORE calling URL-based
 * platforms (Facebook/Instagram), because their APIs fetch the public image
 * URL server-side — which only serves non-deleted newsletters.
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
  NEWSLETTER_STRINGS,
  type NewsletterPlatform,
} from '@/config/admin-strings';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

const PublishSchema = z.object({
  platforms: z.array(z.enum(NEWSLETTER_PLATFORMS)).min(1),
  captions: z.record(z.string(), z.string().max(3000)).optional(),
});

const URL_BASED_PLATFORMS: ReadonlySet<string> = new Set(['facebook', 'instagram']);

async function recordAttempt(
  newsletterId: string,
  platform: NewsletterPlatform,
  caption: string,
  adminId: string,
  result: SocialPublishResult,
): Promise<void> {
  const posted = result.success;
  // Unique constraint (newsletterId, platform) — replace any prior failed
  // attempt so retries work, but never touch a POSTED row (guard is upstream).
  await prisma.newsletterPost.upsert({
    where: { newsletterId_platform: { newsletterId, platform } },
    create: {
      newsletterId,
      platform,
      caption,
      status: posted ? NEWSLETTER_POST_STATUS.POSTED : NEWSLETTER_POST_STATUS.FAILED,
      externalId: result.externalId ?? null,
      errorMsg: result.error ?? null,
      postedAt: posted ? new Date() : null,
      postedByAdmin: adminId,
    },
    update: {
      caption,
      status: posted ? NEWSLETTER_POST_STATUS.POSTED : NEWSLETTER_POST_STATUS.FAILED,
      externalId: result.externalId ?? null,
      errorMsg: result.error ?? null,
      postedAt: posted ? new Date() : null,
      postedByAdmin: adminId,
    },
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
    return NextResponse.json({ error: NEWSLETTER_STRINGS.ERR_NOT_FOUND }, { status: 404 });
  }

  // Flip status before publishing so URL-based platforms (FB/IG) can fetch
  // the public image endpoint (which requires non-deleted status).
  if (newsletter.status !== NEWSLETTER_STATUS.PUBLISHED) {
    await prisma.newsletter.update({
      where: { id },
      data: { status: NEWSLETTER_STATUS.PUBLISHED },
    });
  }

  const imageUrl = `${env.NEXTAUTH_URL}/api/newsletter/${id}/image`;
  const results: Record<string, SocialPublishResult> = {};

  // Publish upload-based platforms (LinkedIn, X) first, URL-based (FB, IG) second
  const sorted = [...parsed.data.platforms].sort((a, b) => {
    const aUrl = URL_BASED_PLATFORMS.has(a) ? 1 : 0;
    const bUrl = URL_BASED_PLATFORMS.has(b) ? 1 : 0;
    return aUrl - bUrl;
  });

  for (const platform of sorted) {
    const caption = parsed.data.captions?.[platform] || newsletter.title;

    const existing = await prisma.newsletterPost.findFirst({
      where: { newsletterId: id, platform, status: NEWSLETTER_POST_STATUS.POSTED },
    });
    if (existing) {
      results[platform] = { success: false, error: NEWSLETTER_STRINGS.ERR_ALREADY_POSTED };
      continue;
    }

    const publisher = getPublisher(platform);
    if (!publisher || !(await publisher.isConfigured())) {
      results[platform] = { success: false, error: NEWSLETTER_STRINGS.ERR_NOT_CONFIGURED };
      continue;
    }

    const result = await publisher.publish({
      caption,
      imagePng: Buffer.from(newsletter.imagePng),
      imageUrl,
    });
    results[platform] = result;

    await recordAttempt(id, platform, caption, session.user.id, result);
    await logAdminAction({
      adminId: session.user.id,
      actionType: ADMIN_ACTION_TYPE.NEWSLETTER_PUBLISHED,
      entityType: ADMIN_ENTITY_TYPE.NEWSLETTER,
      entityId: id,
      metadata: { platform, success: result.success, externalId: result.externalId ?? null },
    });
  }

  logger.info('Newsletter publish completed', 'newsletter-publish', {
    newsletterId: id,
    platforms: parsed.data.platforms.join(','),
  });
  return NextResponse.json({ results });
}
