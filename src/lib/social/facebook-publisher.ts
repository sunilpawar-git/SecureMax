/**
 * Facebook Page publisher — Graph API photo post from the public image URL.
 * Vault providers: "facebook_page" (page access token) and
 * "facebook_page_id" (numeric page id). Token sent via Authorization header
 * (not body/query) for security — keeps it out of CDN/WAF body logs.
 */

import { getSecret } from '@/lib/secrets';
import { logger } from '@/lib/logger';
import { fetchWithTimeout, failStep, errorResult } from './http';
import type { SocialPublisher, SocialPublishInput, SocialPublishResult } from './types';

const GRAPH_BASE_URL = 'https://graph.facebook.com/v23.0';

export const facebookPublisher: SocialPublisher = {
  platform: 'facebook',

  async isConfigured(): Promise<boolean> {
    const [token, pageId] = await Promise.all([
      getSecret('facebook_page'),
      getSecret('facebook_page_id'),
    ]);
    return Boolean(token && pageId);
  },

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    const [token, pageId] = await Promise.all([
      getSecret('facebook_page'),
      getSecret('facebook_page_id'),
    ]);
    if (!token || !pageId) return { success: false, error: 'Facebook is not configured' };

    if (!/^\d+$/.test(pageId)) {
      return { success: false, error: 'Invalid Facebook page ID format' };
    }

    try {
      const res = await fetchWithTimeout(`${GRAPH_BASE_URL}/${pageId}/photos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: input.imageUrl,
          caption: input.caption,
        }),
      });
      if (!res.ok) return failStep('Facebook', 'photo post', res);
      const json = (await res.json()) as { id?: string; post_id?: string };
      const externalId = json.post_id ?? json.id;

      logger.info('Facebook newsletter image posted', 'facebook-publisher', {
        externalId: externalId ?? 'unknown',
      });
      return { success: true, externalId };
    } catch (err) {
      return errorResult('Facebook', err);
    }
  },
};
