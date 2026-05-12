/**
 * Questionnaire API routes — proxies to FastAPI AI service.
 * POST /api/questionnaire?action=start|answer|resume|abandon
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiServiceFetch, AIServiceError } from '@/lib/ai-service';

// Auth check (client sends user_id in session after login)
// For testing purposes, optional auth - allow requests if no session

export async function POST(request: NextRequest) {
  let userId: string | undefined;

  // First, try to get X-User-Id from client request (test mode)
  userId = request.headers.get('X-User-Id') ?? undefined;

  // Otherwise, try to get from authenticated session
  if (!userId) {
    try {
      const session = await auth();
      userId = session?.user?.id;
    } catch (error) {
      // Auth may fail in dev/test mode
    }
  }

  // Last resort: generate a test user ID
  if (!userId) {
    userId = 'test-user-' + Math.random().toString(36).substring(7);
  }

  const action = request.nextUrl.searchParams.get('action');
  const body = await request.json();

  const userHeaders = { 'X-User-Id': userId };

  try {
    switch (action) {
      case 'start': {
        const result = await aiServiceFetch('/questionnaire/start', {
          body: { user_id: userId, track: body.track },
          headers: userHeaders,
        });
        return NextResponse.json(result);
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
        return NextResponse.json(result);
      }
      case 'resume': {
        const result = await aiServiceFetch('/questionnaire/resume', {
          body: { session_id: body.session_id },
          headers: userHeaders,
        });
        return NextResponse.json(result);
      }
      case 'abandon': {
        const result = await aiServiceFetch(
          `/questionnaire/${body.session_id}/abandon`,
          { body: {}, headers: userHeaders },
        );
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, answer, resume, abandon' },
          { status: 400 },
        );
    }
  } catch (error) {
    if (error instanceof AIServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
