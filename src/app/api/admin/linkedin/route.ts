/**
 * Admin LinkedIn post draft endpoint.
 * Proxies to FastAPI /linkedin/draft for Gemini-powered draft generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { aiServiceFetch, AIServiceError } from '@/lib/ai-service';
import { LinkedInDraftSchema } from '@/lib/admin/validators';
import { ADMIN_ERR } from '@/config/admin-strings';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const LogPostSchema = z.object({ postText: z.string().min(1).max(3000) });

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
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
    const result = await aiServiceFetch('/linkedin/draft', { body: parsed.data });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AIServiceError) {
      logger.error('AI service error', 'linkedin-route', {
        status: error.statusCode,
      });
      const clientStatus = error.statusCode >= 500 ? 503 : error.statusCode;
      return NextResponse.json(
        { error: 'LinkedIn draft service unavailable — check service logs' },
        { status: clientStatus },
      );
    }
    logger.error('Unexpected error', 'linkedin-route');
    return NextResponse.json({ error: 'LinkedIn draft service unavailable' }, { status: 503 });
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
    await prisma.linkedinPost.create({
      data: {
        draftText: parsed.data.postText,
        status: 'copied',
        platform: 'linkedin',
        postedByAdmin: session.user.id,
      },
    });
    return NextResponse.json({ logged: true });
  } catch (err) {
    logger.error('Failed to log LinkedIn post', 'linkedin-route', { detail: String(err) });
    return NextResponse.json({ error: 'Failed to log post' }, { status: 500 });
  }
}
