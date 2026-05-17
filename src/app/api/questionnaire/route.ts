/**
 * Questionnaire API routes — proxies to FastAPI AI service.
 * POST /api/questionnaire?action=start|answer|resume|abandon
 *
 * Identity is sourced exclusively from the authenticated NextAuth session.
 * Client-supplied X-User-Id headers are intentionally ignored to prevent
 * user impersonation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse, apiSuccess, apiError } from '@/lib/api';
import { aiServiceFetch, AIServiceError } from '@/lib/ai-service';
import { prisma } from '@/lib/prisma';
import { LIMITS, LIMITS_ERR } from '@/config/strings';

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return unauthorizedResponse();

  const userId = session.user.id;
  const action = request.nextUrl.searchParams.get('action');

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid or missing JSON body');
  }

  const userHeaders = { 'X-User-Id': userId };

  try {
    switch (action) {
      case 'start': {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const sessionCount = await prisma.auditSession.count({
          where: { userId, createdAt: { gte: startOfMonth } },
        });

        if (sessionCount >= LIMITS.MAX_SESSIONS_PER_USER_PER_MONTH) {
          return apiError(LIMITS_ERR.SESSION_CAP_REACHED, 429);
        }

        const result = await aiServiceFetch('/questionnaire/start', {
          body: { user_id: userId, track: body.track },
          headers: userHeaders,
        });
        return apiSuccess(result);
      }
      case 'answer': {
        const result = await aiServiceFetch('/questionnaire/answer', {
          body: {
            session_id: body.session_id,
            question_id: body.question_id,
            answer: body.answer,
          },
          headers: userHeaders,
        });
        return apiSuccess(result);
      }
      case 'resume': {
        const result = await aiServiceFetch('/questionnaire/resume', {
          body: { session_id: body.session_id },
          headers: userHeaders,
        });
        return apiSuccess(result);
      }
      case 'abandon': {
        const result = await aiServiceFetch(`/questionnaire/${body.session_id}/abandon`, {
          body: {},
          headers: userHeaders,
        });
        return apiSuccess(result);
      }
      default:
        return apiError('Invalid action. Use: start, answer, resume, abandon');
    }
  } catch (error) {
    if (error instanceof AIServiceError) {
      const payload: Record<string, unknown> = { error: error.message };
      if (error.sessionId) payload.session_id = error.sessionId;
      return NextResponse.json(payload, { status: error.statusCode });
    }
    return apiError('Internal server error', 500);
  }
}
