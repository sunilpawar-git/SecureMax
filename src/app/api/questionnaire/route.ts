/**
 * Questionnaire API routes — proxies to FastAPI AI service.
 * POST /api/questionnaire?action=start|answer|resume|abandon
 *
 * Every action is validated with Zod at the Next layer before proxying.
 * Identity is sourced exclusively from the authenticated NextAuth session.
 * Client-supplied X-User-Id headers are intentionally ignored to prevent
 * user impersonation.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  unauthorizedResponse,
  apiSuccess,
  apiError,
  apiValidationError,
  validateData,
} from '@/lib/api';
import { aiServiceFetch, AIServiceError } from '@/lib/ai-service';
import { prisma } from '@/lib/prisma';
import { LIMITS, LIMITS_ERR, VALIDATION_ERR } from '@/config/strings';
import { StartSchema, AnswerSchema, ResumeSchema, AbandonSchema } from './schemas';

type Action = 'start' | 'answer' | 'resume' | 'abandon';
const ACTIONS: readonly Action[] = ['start', 'answer', 'resume', 'abandon'];

function isAction(value: string | null): value is Action {
  return value !== null && (ACTIONS as readonly string[]).includes(value);
}

async function handleStart(userId: string, track: string, userHeaders: Record<string, string>) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const sessionCount = await prisma.auditSession.count({
    where: { userId, createdAt: { gte: startOfMonth } },
  });

  // Dev mode bypass: ignore session cap in development
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev && sessionCount >= LIMITS.MAX_SESSIONS_PER_USER_PER_MONTH) {
    return apiError(LIMITS_ERR.SESSION_CAP_REACHED, 429);
  }

  const result = await aiServiceFetch('/questionnaire/start', {
    body: { user_id: userId, track },
    headers: userHeaders,
  });
  return apiSuccess(result);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return unauthorizedResponse();

  const userId = session.user.id;
  const action = request.nextUrl.searchParams.get('action');

  if (!isAction(action)) {
    return apiError('Invalid action. Use: start, answer, resume, abandon');
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError(VALIDATION_ERR.INVALID_BODY);
  }

  const userHeaders = { 'X-User-Id': userId };

  try {
    switch (action) {
      case 'start': {
        const parsed = validateData(raw, StartSchema);
        if (!parsed.success) return apiValidationError(parsed.errors);
        return await handleStart(userId, parsed.data.track, userHeaders);
      }
      case 'answer': {
        const parsed = validateData(raw, AnswerSchema);
        if (!parsed.success) return apiValidationError(parsed.errors);
        const result = await aiServiceFetch('/questionnaire/answer', {
          body: {
            session_id: parsed.data.session_id,
            question_id: parsed.data.question_id,
            answer: parsed.data.answer,
          },
          headers: userHeaders,
        });
        return apiSuccess(result);
      }
      case 'resume': {
        const parsed = validateData(raw, ResumeSchema);
        if (!parsed.success) return apiValidationError(parsed.errors);
        const result = await aiServiceFetch('/questionnaire/resume', {
          body: { session_id: parsed.data.session_id },
          headers: userHeaders,
        });
        return apiSuccess(result);
      }
      case 'abandon': {
        const parsed = validateData(raw, AbandonSchema);
        if (!parsed.success) return apiValidationError(parsed.errors);
        const result = await aiServiceFetch(`/questionnaire/${parsed.data.session_id}/abandon`, {
          body: {},
          headers: userHeaders,
        });
        return apiSuccess(result);
      }
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
