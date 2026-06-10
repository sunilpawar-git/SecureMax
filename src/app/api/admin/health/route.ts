/**
 * Admin service-health endpoint.
 * Reports actionable config state as booleans ONLY — never URLs, key values,
 * or fragments (config state is reconnaissance data; admin-gated for the
 * same reason). Checks are on-demand per page load, not continuous monitoring.
 */

import { NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { aiServiceFetch, AIServiceError } from '@/lib/ai-service';
import { env, isPlaceholder } from '@/lib/env';
import { logger } from '@/lib/logger';

const HEALTH_TIMEOUT_MS = 3_000;

export async function GET() {
  if (!(await verifyAdmin())) return forbiddenResponse();

  let aiServiceReachable = false;
  let aiServiceAuthOk = false;

  try {
    await aiServiceFetch('/health', { method: 'GET', timeoutMs: HEALTH_TIMEOUT_MS });
    aiServiceReachable = true;
  } catch (err) {
    logger.warn('AI service health ping failed', 'admin-health', { detail: String(err) });
  }

  if (aiServiceReachable) {
    try {
      // /scraper/health goes through ServiceAuthMiddleware — proves the key works
      await aiServiceFetch('/scraper/health', { method: 'GET', timeoutMs: HEALTH_TIMEOUT_MS });
      aiServiceAuthOk = true;
    } catch (err) {
      const rejected =
        err instanceof AIServiceError && (err.statusCode === 401 || err.statusCode === 403);
      // A non-auth failure (e.g. transient 500) is not a key problem
      aiServiceAuthOk = !rejected;
      if (rejected) {
        logger.warn('AI service rejected the service key', 'admin-health');
      }
    }
  }

  const linkedinConfigured =
    !isPlaceholder(env.LINKEDIN_ACCESS_TOKEN) && !isPlaceholder(env.LINKEDIN_ORG_ID);

  return NextResponse.json({ aiServiceReachable, aiServiceAuthOk, linkedinConfigured });
}
