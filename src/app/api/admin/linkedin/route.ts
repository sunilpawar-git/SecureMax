/**
 * Admin LinkedIn post draft endpoint.
 * Proxies to FastAPI /linkedin/draft for Gemini-powered draft generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiServiceFetch, AIServiceError } from '@/lib/ai-service';

async function verifyAdmin() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== 'admin') {
    return null;
  }
  return session;
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const result = await aiServiceFetch('/linkedin/draft', { body });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AIServiceError) {
      // Log real detail server-side; never forward internal messages to browser
      console.error('[linkedin-route] AI service error', {
        status: error.statusCode,
        detail: error.message,
      });
      const clientStatus = error.statusCode >= 500 ? 503 : error.statusCode;
      return NextResponse.json(
        { error: 'LinkedIn draft service unavailable — check service logs' },
        { status: clientStatus },
      );
    }
    console.error('[linkedin-route] Unexpected error', error);
    return NextResponse.json(
      { error: 'LinkedIn draft service unavailable' },
      { status: 503 },
    );
  }
}
