/**
 * LinkedIn direct posting — server-side only.
 * Publishes to the company page via the versioned Posts API
 * (POST https://api.linkedin.com/rest/posts). The legacy v2/ugcPosts
 * endpoint is deprecated — do not use it.
 *
 * Credentials resolve vault-first via getSecret() ('linkedin',
 * 'linkedin_org_id') with env fallback, and never leave the server.
 * Known debt: tokens expire (~60 days) and there is no refresh flow yet —
 * surfaced in the API Keys UI (Phase 9).
 */

import { getSecret } from '@/lib/secrets';
import { logger } from '@/lib/logger';

const LINKEDIN_POSTS_URL = 'https://api.linkedin.com/rest/posts';
// Versioned API: YYYYMM. Bump deliberately — payload shape may change.
const LINKEDIN_API_VERSION = '202506';
const PUBLISH_TIMEOUT_MS = 10_000;

export interface PublishResult {
  success: boolean;
  linkedinPostId?: string;
  error?: string;
}

export function buildPostPayload(postText: string, orgId: string): Record<string, unknown> {
  return {
    author: `urn:li:organization:${orgId}`,
    commentary: postText,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };
}

/**
 * Publish a post to the company page. No automatic retry on timeout —
 * the admin re-triggers manually (avoids accidental duplicate posts).
 */
export async function publishToLinkedIn(postText: string): Promise<PublishResult> {
  const accessToken = await getSecret('linkedin');
  const orgId = await getSecret('linkedin_org_id');

  if (!accessToken || !orgId) {
    logger.error('LinkedIn publish skipped — credentials not configured', 'linkedin-post');
    return { success: false, error: 'LinkedIn is not configured' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PUBLISH_TIMEOUT_MS);

  try {
    logger.info('Publishing post to LinkedIn', 'linkedin-post', { chars: postText.length });
    const res = await fetch(LINKEDIN_POSTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': LINKEDIN_API_VERSION,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildPostPayload(postText, orgId)),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logger.error('LinkedIn publish failed', 'linkedin-post', {
        status: res.status,
        detail: detail.slice(0, 500),
      });
      return { success: false, error: `LinkedIn API error (${res.status})` };
    }

    // Posts API returns the new post URN in the x-restli-id header (201, empty body)
    const linkedinPostId = res.headers.get('x-restli-id') ?? undefined;
    logger.info('LinkedIn post published', 'linkedin-post', {
      linkedinPostId: linkedinPostId ?? 'unknown',
    });
    return { success: true, linkedinPostId };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'AbortError';
    logger.error('LinkedIn publish error', 'linkedin-post', {
      detail: timedOut ? 'timeout' : String(err),
    });
    return {
      success: false,
      error: timedOut ? 'LinkedIn request timed out' : 'LinkedIn request failed',
    };
  } finally {
    clearTimeout(timer);
  }
}
