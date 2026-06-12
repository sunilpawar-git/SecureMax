/**
 * SocialPublisher contract — one adapter per platform (SOLID: the publish
 * route depends on this interface, never on platform SDKs/APIs directly).
 */

import type { NewsletterPlatform } from '@/config/admin-strings';

export interface SocialPublishInput {
  caption: string;
  /** Raw PNG bytes — used by upload-based platforms (LinkedIn, X). */
  imagePng: Buffer;
  /** Public image URL — used by URL-based platforms (Instagram, Facebook). */
  imageUrl: string;
}

export interface SocialPublishResult {
  success: boolean;
  /** Platform-side post id / URN, for the audit trail. */
  externalId?: string;
  error?: string;
}

export interface SocialPublisher {
  platform: NewsletterPlatform;
  /** True when all required secrets resolve (vault or env). */
  isConfigured(): Promise<boolean>;
  publish(input: SocialPublishInput): Promise<SocialPublishResult>;
}
