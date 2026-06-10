/**
 * Publisher registry — the only import surface for the publish route.
 * Phase 9 adds the x / facebook / instagram adapters here.
 */

import type { NewsletterPlatform } from '@/config/admin-strings';
import { facebookPublisher } from './facebook-publisher';
import { instagramPublisher } from './instagram-publisher';
import { linkedinPublisher } from './linkedin-publisher';
import { xPublisher } from './x-publisher';
import type { SocialPublisher } from './types';

const PUBLISHERS: Partial<Record<NewsletterPlatform, SocialPublisher>> = {
  linkedin: linkedinPublisher,
  x: xPublisher,
  facebook: facebookPublisher,
  instagram: instagramPublisher,
};

export function getPublisher(platform: NewsletterPlatform): SocialPublisher | null {
  return PUBLISHERS[platform] ?? null;
}

export type { SocialPublisher, SocialPublishInput, SocialPublishResult } from './types';
