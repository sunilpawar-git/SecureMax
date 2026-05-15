/**
 * Questionnaire API routes — proxies to FastAPI AI service.
 * POST /api/questionnaire?action=start|answer|resume|abandon
 *
 * Identity is sourced exclusively from the authenticated NextAuth session.
 * Client-supplied X-User-Id headers are intentionally ignored to prevent
 * user impersonation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiServiceFetch, AIServiceError } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  const session = await auth();
  const isDev = process.env.NODE_ENV !== 'production';
  const userId = session?.user?.id ?? (isDev ? 'dev-guest' : null);

  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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
        const result = await aiServiceFetch(`/questionnaire/${body.session_id}/abandon`, {
          body: {},
          headers: userHeaders,
        });
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
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
