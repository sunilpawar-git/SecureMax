/**
 * Admin service-health endpoint.
 * Reports actionable config state as booleans ONLY — never URLs, key values,
 * or fragments (config state is reconnaissance data; admin-gated for the
 * same reason). Checks are on-demand per page load, not continuous monitoring.
 */

import { NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { aiServiceFetch, AIServiceError } from '@/lib/ai-service';
import { getSecret } from '@/lib/secrets';
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
      await aiServiceFetch('/scraper/health', { method: 'GET', timeoutMs: HEALTH_TIMEOUT_MS });
      aiServiceAuthOk = true;
    } catch (err) {
      const rejected =
        err instanceof AIServiceError && (err.statusCode === 401 || err.statusCode === 403);
      aiServiceAuthOk = !rejected;
      if (rejected) {
        logger.warn('AI service rejected the service key', 'admin-health');
      }
    }
  }

  // Resolve via vault-first (same path publishers use) — not raw env
  const [linkedinToken, linkedinOrg] = await Promise.all([
    getSecret('linkedin'),
    getSecret('linkedin_org_id'),
  ]);
  const linkedinConfigured = Boolean(linkedinToken && linkedinOrg);

  return NextResponse.json({ aiServiceReachable, aiServiceAuthOk, linkedinConfigured });
}
