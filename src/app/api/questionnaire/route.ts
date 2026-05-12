/**
 * Questionnaire API routes — proxies to FastAPI AI service.
 * POST /api/questionnaire?action=start|answer|resume|abandon
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiServiceFetch, AIServiceError } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const action = request.nextUrl.searchParams.get('action');
  const body = await request.json();

  const userHeaders = { 'X-User-Id': session.user.id };

  try {
    switch (action) {
      case 'start': {
        const result = await aiServiceFetch('/questionnaire/start', {
          body: { user_id: session.user.id, track: body.track },
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
