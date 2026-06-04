/**
 * Admin Knowledge Base API — proxies CPP stats/ingest to FastAPI.
 * GET  = domain chunk stats
 * POST = upload & ingest a CPP document
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { apiSuccess, apiError } from '@/lib/api';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

const SERVICE_TIMEOUT_MS = 60_000;

function serviceUrl(path: string): string {
  const base = env.AI_SERVICE_URL || 'http://localhost:8000';
  return `${base}${path}`;
}

function serviceHeaders(): Record<string, string> {
  return { 'X-Service-Key': env.AI_SERVICE_KEY };
}

export async function GET() {
  if (!(await verifyAdmin())) {
    return forbiddenResponse();
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SERVICE_TIMEOUT_MS);
    const res = await fetch(serviceUrl('/admin/cpp/stats'), {
      method: 'GET',
      headers: serviceHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logger.error('CPP stats fetch failed', 'kb-route', { status: res.status, detail });
      return apiError('Failed to load knowledge base stats', res.status >= 500 ? 503 : res.status);
    }
    const data = await res.json();
    return apiSuccess(data);
  } catch (err) {
    logger.error('KB stats error', 'kb-route', { err: String(err) });
    return apiError('Knowledge base service unavailable', 503);
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return forbiddenResponse();
  }
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const domain = formData.get('domain');

    if (!file || !domain) {
      return NextResponse.json({ error: 'file and domain are required' }, { status: 400 });
    }

    const upstreamForm = new FormData();
    upstreamForm.append('file', file);
    upstreamForm.append('domain', domain);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SERVICE_TIMEOUT_MS);
    const res = await fetch(serviceUrl('/admin/cpp/ingest'), {
      method: 'POST',
      headers: serviceHeaders(),
      body: upstreamForm,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logger.error('CPP ingest failed', 'kb-route', { status: res.status, detail });
      return apiError('Document ingestion failed', res.status >= 500 ? 503 : res.status);
    }
    const data = await res.json();
    return apiSuccess(data);
  } catch (err) {
    logger.error('KB ingest error', 'kb-route', { err: String(err) });
    return apiError('Knowledge base service unavailable', 503);
  }
}
