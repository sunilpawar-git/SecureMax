/**
 * Admin scraper API — triggers scraper and returns health.
 * POST = run scraper, GET?action=health = source health
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

export async function POST() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const result = await aiServiceFetch('/scraper/run', { body: {} });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AIServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Scraper unavailable' }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    if (error instanceof AIServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
