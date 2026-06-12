/**
 * Instagram publisher — Graph API two-step flow: create a media container
 * from the public image URL, poll until FINISHED, then publish it.
 * Vault providers: "instagram" (access token) and "instagram_account_id"
 * (IG business account id). Token sent via Authorization header (not body)
 * for security. Prerequisites: IG Business account linked to a Facebook
 * Page, and Meta App Review approval for content publishing.
 */

import { getSecret } from '@/lib/secrets';
import { logger } from '@/lib/logger';
import { fetchWithTimeout, failStep, errorResult } from './http';
import type { SocialPublisher, SocialPublishInput, SocialPublishResult } from './types';

const GRAPH_BASE_URL = 'https://graph.facebook.com/v23.0';
const CONTAINER_POLL_INTERVAL_MS = 2_000;
const CONTAINER_POLL_MAX_ATTEMPTS = 15; // 30s max wait

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

    if (!/^\d+$/.test(accountId)) {
      return { success: false, error: 'Invalid Instagram account ID format' };
    }

    try {
      // Step 1 — Create media container
      const containerRes = await fetchWithTimeout(`${GRAPH_BASE_URL}/${accountId}/media`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: input.imageUrl,
          caption: input.caption,
        }),
      });
      if (!containerRes.ok) return failStep('Instagram', 'container create', containerRes);
      const containerJson = (await containerRes.json()) as { id?: string };
      if (!containerJson.id) {
        return { success: false, error: 'Instagram container create returned no id' };
      }

      // Step 2 — Poll container status until FINISHED
      for (let i = 0; i < CONTAINER_POLL_MAX_ATTEMPTS; i++) {
        await new Promise((r) => setTimeout(r, CONTAINER_POLL_INTERVAL_MS));
        const statusRes = await fetchWithTimeout(
          `${GRAPH_BASE_URL}/${containerJson.id}?fields=status_code`,
          { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
        );
        if (!statusRes.ok) continue;
        const statusJson = (await statusRes.json()) as { status_code?: string };
        if (statusJson.status_code === 'FINISHED') break;
        if (statusJson.status_code === 'ERROR') {
          return { success: false, error: 'Instagram container processing failed' };
        }
      }

      // Step 3 — Publish the container
      const publishRes = await fetchWithTimeout(`${GRAPH_BASE_URL}/${accountId}/media_publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ creation_id: containerJson.id }),
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
