/**
 * Admin scraper API -- triggers scraper and returns health.
 * POST = run scraper, GET?action=health = source health
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { aiServiceFetch, AIServiceError } from '@/lib/ai-service';

function handleServiceError(error: unknown, fallbackMessage: string): NextResponse {
  if (error instanceof AIServiceError) {
    console.error('[scraper-route] AI service error', {
      status: error.statusCode,
    });
    const clientStatus = error.statusCode >= 500 ? 503 : error.statusCode;
    return NextResponse.json({ error: fallbackMessage }, { status: clientStatus });
  }
  console.error('[scraper-route] Unexpected error');
  return NextResponse.json({ error: fallbackMessage }, { status: 503 });
}

export async function POST() {
  if (!(await verifyAdmin())) {
    return forbiddenResponse();
  }
  try {
    const result = await aiServiceFetch('/scraper/run', { body: {} });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error, 'Scraper unavailable — check service logs');
  }
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return forbiddenResponse();
  }
  const action = request.nextUrl.searchParams.get('action');
  try {
    if (action === 'health') {
      const result = await aiServiceFetch('/scraper/health', { method: 'GET' });
      return NextResponse.json(result);
    }
    const result = await aiServiceFetch('/scraper/articles', { method: 'GET' });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error, 'Service unavailable — check service logs');
  }
}
