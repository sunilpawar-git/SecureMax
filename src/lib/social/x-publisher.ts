/**
 * X (Twitter) publisher — v2 API: media upload, then tweet with media id.
 * Requires an OAuth 2.0 user access token with tweet.write + media.write
 * (provider "x_api" in the vault). Note: posting requires a paid API tier.
 */

import { getSecret } from '@/lib/secrets';
import { logger } from '@/lib/logger';
import { fetchWithTimeout, failStep, errorResult } from './http';
import type { SocialPublisher, SocialPublishInput, SocialPublishResult } from './types';

const X_MEDIA_UPLOAD_URL = 'https://api.x.com/2/media/upload';
const X_TWEETS_URL = 'https://api.x.com/2/tweets';
const X_MAX_CHARS = 280;

export const xPublisher: SocialPublisher = {
  platform: 'x',

  async isConfigured(): Promise<boolean> {
    return Boolean(await getSecret('x_api'));
  },

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    const token = await getSecret('x_api');
    if (!token) return { success: false, error: 'X is not configured' };

    try {
      const form = new FormData();
      form.append('media', new Blob([new Uint8Array(input.imagePng)], { type: 'image/png' }));
      form.append('media_category', 'tweet_image');

      const uploadRes = await fetchWithTimeout(X_MEDIA_UPLOAD_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!uploadRes.ok) return failStep('X', 'media upload', uploadRes);
      const uploadJson = (await uploadRes.json()) as { data?: { id?: string } };
      const mediaId = uploadJson.data?.id;
      if (!mediaId) return { success: false, error: 'X media upload returned no id' };

      const tweetRes = await fetchWithTimeout(X_TWEETS_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: input.caption.slice(0, X_MAX_CHARS),
          media: { media_ids: [mediaId] },
        }),
      });
      if (!tweetRes.ok) return failStep('X', 'tweet create', tweetRes);
      const tweetJson = (await tweetRes.json()) as { data?: { id?: string } };

      logger.info('X newsletter image posted', 'x-publisher', {
        externalId: tweetJson.data?.id ?? 'unknown',
      });
      return { success: true, externalId: tweetJson.data?.id };
    } catch (err) {
      return errorResult('X', err);
    }
  },
};
