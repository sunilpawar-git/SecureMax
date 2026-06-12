/**
 * LinkedIn image publisher — versioned REST API (never legacy ugcPosts).
 * Three-step flow: initializeUpload → PUT bytes → create post with the
 * returned image URN. Credentials resolve vault-first via getSecret().
 */

import { getSecret } from '@/lib/secrets';
import { logger } from '@/lib/logger';
import { fetchWithTimeout, failStep, errorResult } from './http';
import type { SocialPublisher, SocialPublishInput, SocialPublishResult } from './types';

const LINKEDIN_IMAGES_URL = 'https://api.linkedin.com/rest/images?action=initializeUpload';
const LINKEDIN_POSTS_URL = 'https://api.linkedin.com/rest/posts';
const LINKEDIN_API_VERSION = '202506';

function apiHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'LinkedIn-Version': LINKEDIN_API_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
    'Content-Type': 'application/json',
  };
}

export const linkedinPublisher: SocialPublisher = {
  platform: 'linkedin',

  async isConfigured(): Promise<boolean> {
    const [token, orgId] = await Promise.all([getSecret('linkedin'), getSecret('linkedin_org_id')]);
    return Boolean(token && orgId);
  },

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    const [token, orgId] = await Promise.all([getSecret('linkedin'), getSecret('linkedin_org_id')]);
    if (!token || !orgId) {
      return { success: false, error: 'LinkedIn is not configured' };
    }

    try {
      // Step 1 — register the upload, get an image URN + one-time upload URL
      const initRes = await fetchWithTimeout(LINKEDIN_IMAGES_URL, {
        method: 'POST',
        headers: apiHeaders(token),
        body: JSON.stringify({
          initializeUploadRequest: { owner: `urn:li:organization:${orgId}` },
        }),
      });
      if (!initRes.ok) return failStep('LinkedIn', 'image init', initRes);
      const initJson = (await initRes.json()) as {
        value?: { uploadUrl?: string; image?: string };
      };
      const uploadUrl = initJson.value?.uploadUrl;
      const imageUrn = initJson.value?.image;
      if (!uploadUrl || !imageUrn) {
        return { success: false, error: 'LinkedIn image init returned no upload URL' };
      }

      // Step 2 — upload the PNG bytes
      const uploadRes = await fetchWithTimeout(uploadUrl, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: new Uint8Array(input.imagePng),
      });
      if (!uploadRes.ok) return failStep('LinkedIn', 'image upload', uploadRes);

      // Step 3 — create the post referencing the image URN
      const postRes = await fetchWithTimeout(LINKEDIN_POSTS_URL, {
        method: 'POST',
        headers: apiHeaders(token),
        body: JSON.stringify({
          author: `urn:li:organization:${orgId}`,
          commentary: input.caption,
          visibility: 'PUBLIC',
          distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          content: { media: { id: imageUrn } },
          lifecycleState: 'PUBLISHED',
          isReshareDisabledByAuthor: false,
        }),
      });
      if (!postRes.ok) return failStep('LinkedIn', 'post create', postRes);

      const externalId = postRes.headers.get('x-restli-id') ?? undefined;
      logger.info('LinkedIn newsletter image posted', 'linkedin-publisher', {
        externalId: externalId ?? 'unknown',
      });
      return { success: true, externalId };
    } catch (err) {
      return errorResult('LinkedIn', err);
    }
  },
};
