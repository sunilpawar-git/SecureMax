/**
 * Report API routes — proxies to FastAPI AI service.
 * POST /api/report?action=generate
 * GET /api/report?action=status|summary|full&report_id=X
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

  try {
    if (action === 'generate') {
      const result = await aiServiceFetch('/report/generate', {
        body: { session_id: body.session_id },
        userId: session.user.id,
      });
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof AIServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const action = request.nextUrl.searchParams.get('action');
  const reportId = request.nextUrl.searchParams.get('report_id');

  if (!reportId) {
    return NextResponse.json({ error: 'report_id required' }, { status: 400 });
  }

  try {
    switch (action) {
      case 'status': {
        const result = await aiServiceFetch(`/report/${reportId}/status`, {
          method: 'GET',
          userId: session.user.id,
        });
        return NextResponse.json(result);
      }
      case 'summary': {
        const result = await aiServiceFetch(`/report/${reportId}/summary`, {
          method: 'GET',
          userId: session.user.id,
        });
        return NextResponse.json(result);
      }
      case 'full': {
        const result = await aiServiceFetch(`/report/${reportId}/full`, {
          method: 'GET',
          userId: session.user.id,
        });
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: status, summary, full' },
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
