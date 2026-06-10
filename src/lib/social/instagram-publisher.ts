/**
 * Instagram publisher — Graph API two-step flow: create a media container
 * from the public image URL, then publish it. Vault providers: "instagram"
 * (access token) and "instagram_account_id" (IG business account id).
 * Prerequisites: IG Business account linked to a Facebook Page, and Meta
 * App Review approval for content publishing.
 */

import { getSecret } from '@/lib/secrets';
import { logger } from '@/lib/logger';
import { fetchWithTimeout, failStep, errorResult } from './http';
import type { SocialPublisher, SocialPublishInput, SocialPublishResult } from './types';

const GRAPH_BASE_URL = 'https://graph.facebook.com/v23.0';

export const instagramPublisher: SocialPublisher = {
  platform: 'instagram',

  async isConfigured(): Promise<boolean> {
    const [token, accountId] = await Promise.all([
      getSecret('instagram'),
      getSecret('instagram_account_id'),
    ]);
    return Boolean(token && accountId);
  },

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    const [token, accountId] = await Promise.all([
      getSecret('instagram'),
      getSecret('instagram_account_id'),
    ]);
    if (!token || !accountId) return { success: false, error: 'Instagram is not configured' };

    try {
      const containerRes = await fetchWithTimeout(`${GRAPH_BASE_URL}/${accountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: input.imageUrl,
          caption: input.caption,
          access_token: token,
        }),
      });
      if (!containerRes.ok) return failStep('Instagram', 'container create', containerRes);
      const containerJson = (await containerRes.json()) as { id?: string };
      if (!containerJson.id) {
        return { success: false, error: 'Instagram container create returned no id' };
      }

      const publishRes = await fetchWithTimeout(`${GRAPH_BASE_URL}/${accountId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: containerJson.id, access_token: token }),
      });
      if (!publishRes.ok) return failStep('Instagram', 'media publish', publishRes);
      const publishJson = (await publishRes.json()) as { id?: string };

      logger.info('Instagram newsletter image posted', 'instagram-publisher', {
        externalId: publishJson.id ?? 'unknown',
      });
      return { success: true, externalId: publishJson.id };
    } catch (err) {
      return errorResult('Instagram', err);
    }
  },
};
