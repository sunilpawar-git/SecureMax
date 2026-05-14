/**
 * Admin LinkedIn post draft endpoint.
 * Proxies to FastAPI /linkedin/draft for Gemini-powered draft generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { aiServiceFetch, AIServiceError } from '@/lib/ai-service';
import { ADMIN_ERR } from '@/config/admin-strings';

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return forbiddenResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: ADMIN_ERR.INVALID_REQUEST }, { status: 400 });
  }

  try {
    const result = await aiServiceFetch('/linkedin/draft', { body });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AIServiceError) {
      console.error('[linkedin-route] AI service error', {
        status: error.statusCode,
      });
      const clientStatus = error.statusCode >= 500 ? 503 : error.statusCode;
      return NextResponse.json(
        { error: 'LinkedIn draft service unavailable — check service logs' },
        { status: clientStatus },
      );
    }
    console.error('[linkedin-route] Unexpected error');
    return NextResponse.json(
      { error: 'LinkedIn draft service unavailable' },
      { status: 503 },
    );
  }
}
