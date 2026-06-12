/**
 * Admin scraper API -- triggers scraper and returns health.
 * POST = run scraper, GET?action=health = source health
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { aiServiceFetch, AIServiceError } from '@/lib/ai-service';
import { logger } from '@/lib/logger';

function handleServiceError(error: unknown, fallbackMessage: string): NextResponse {
  if (error instanceof AIServiceError) {
    logger.error('AI service error', 'scraper-route', {
      status: error.statusCode,
    });
    const clientStatus = error.statusCode >= 500 ? 503 : error.statusCode;
    return apiError(fallbackMessage, clientStatus);
  }
  logger.error('Unexpected error', 'scraper-route');
  return apiError(fallbackMessage, 503);
}

export async function POST() {
  if (!(await verifyAdmin())) {
    return forbiddenResponse();
  }
  try {
    // Pipeline runs as a background task in FastAPI; this POST returns in <1 s.
    const result = await aiServiceFetch('/scraper/run', { body: {} });
    return apiSuccess(result);
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
      return apiSuccess(result);
    }
    const result = await aiServiceFetch('/scraper/articles', { method: 'GET' });
    return apiSuccess(result);
  } catch (error) {
    return handleServiceError(error, 'Service unavailable — check service logs');
  }
}
