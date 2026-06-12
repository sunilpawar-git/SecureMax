/**
 * X (Twitter) publisher — v1.1 chunked media upload + v2 tweet creation.
 * Media upload uses the v1.1 endpoint (INIT → APPEND → FINALIZE) because
 * v2 does not provide a single-shot image upload. Tweeting uses v2.
 * Requires an OAuth 2.0 user access token with tweet.write + media.write
 * (provider "x_api" in the vault). Note: posting requires a paid API tier.
 */

import { getSecret } from '@/lib/secrets';
import { logger } from '@/lib/logger';
import { fetchWithTimeout, failStep, errorResult } from './http';
import type { SocialPublisher, SocialPublishInput, SocialPublishResult } from './types';

const X_MEDIA_UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';
const X_TWEETS_URL = 'https://api.x.com/2/tweets';
const X_MAX_CHARS = 280;
const X_MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB single-chunk limit

export const xPublisher: SocialPublisher = {
  platform: 'x',

  async isConfigured(): Promise<boolean> {
    return Boolean(await getSecret('x_api'));
  },

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    const token = await getSecret('x_api');
    if (!token) return { success: false, error: 'X is not configured' };

    if (input.imagePng.length > X_MAX_IMAGE_BYTES) {
      return { success: false, error: 'Image exceeds X 5MB upload limit' };
    }

    try {
      // Step 1 — INIT: register the upload
      const initParams = new URLSearchParams({
        command: 'INIT',
        total_bytes: String(input.imagePng.length),
        media_type: 'image/png',
        media_category: 'tweet_image',
      });
      const initRes = await fetchWithTimeout(`${X_MEDIA_UPLOAD_URL}?${initParams}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!initRes.ok) return failStep('X', 'media INIT', initRes);
      const initJson = (await initRes.json()) as { media_id_string?: string };
      const mediaId = initJson.media_id_string;
      if (!mediaId) return { success: false, error: 'X media INIT returned no media_id' };

      // Step 2 — APPEND: upload bytes (single chunk for newsletter images)
      const appendForm = new FormData();
      appendForm.append('command', 'APPEND');
      appendForm.append('media_id', mediaId);
      appendForm.append('segment_index', '0');
      appendForm.append('media_data', Buffer.from(input.imagePng).toString('base64'));
      const appendRes = await fetchWithTimeout(X_MEDIA_UPLOAD_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: appendForm,
      });
      if (!appendRes.ok) return failStep('X', 'media APPEND', appendRes);

      // Step 3 — FINALIZE: confirm processing complete
      const finalizeParams = new URLSearchParams({
        command: 'FINALIZE',
        media_id: mediaId,
      });
      const finalizeRes = await fetchWithTimeout(`${X_MEDIA_UPLOAD_URL}?${finalizeParams}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!finalizeRes.ok) return failStep('X', 'media FINALIZE', finalizeRes);

      // Step 4 — Create tweet with attached media
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
