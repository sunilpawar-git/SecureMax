/**
 * SSOT for the newsletter system — lifecycle enums, platforms, and (from
 * Phase 7) admin page labels. Split file following the coupon-strings
 * precedent; re-exported from admin-strings.ts so `@/config/admin-strings`
 * stays the import path.
 */

export const NEWSLETTER_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  DELETED: 'deleted',
} as const;

export const NEWSLETTER_POST_STATUS = {
  PENDING: 'pending',
  POSTED: 'posted',
  FAILED: 'failed',
} as const;

export const NEWSLETTER_PLATFORMS = ['linkedin', 'x', 'facebook', 'instagram'] as const;
export type NewsletterPlatform = (typeof NEWSLETTER_PLATFORMS)[number];

export const NEWSLETTER_STRINGS = {
  PAGE_TITLE: 'Newsletter',
  PAGE_DESCRIPTION:
    'Weekly threat-intel one-pager — auto-drafted every Monday, reviewed here before posting.',
  NAV_LABEL: 'Newsletter',
  GENERATE_CTA: 'Generate Now',
  GENERATING: 'Generating…',
  EMPTY_STATE: 'No newsletters yet. Generate one from recent threat intel.',
  PREVIEW_ALT: 'Newsletter one-pager preview',
  DELETE_CTA: 'Delete',
  DELETE_CONFIRM: 'Delete this newsletter? It will be removed from the review queue.',
  STATUS_LABEL: { draft: 'Draft', published: 'Published', deleted: 'Deleted' } as Record<
    string,
    string
  >,
  ARTICLES_CITED: 'articles cited',
  ERR_LOAD: 'Failed to load newsletters',
  ERR_GENERATE: 'Generation failed — is the AI service running and the scraper populated?',
  ERR_DELETE: 'Failed to delete newsletter',
  PUBLISH_CTA: 'Publish…',
  PUBLISH_MODAL_TITLE: 'Publish newsletter',
  PUBLISH_SUBMIT: 'Publish',
  PUBLISHING: 'Publishing…',
  CAPTION_LABEL: 'Caption (used on all selected platforms)',
  KEYS_MISSING: 'keys missing',
  RESULT_POSTED: 'Posted',
  ERR_PUBLISH: 'Publishing failed — try again',
  ERR_NOT_FOUND: 'Newsletter not found',
  ERR_ALREADY_POSTED: 'Already posted to this platform',
  ERR_NOT_CONFIGURED: 'Platform is not configured — add its API keys first',
  CLOSE: 'Close',
  PLATFORM_LABEL: {
    linkedin: 'LinkedIn',
    x: 'X (Twitter)',
    facebook: 'Facebook',
    instagram: 'Instagram',
  } as Record<string, string>,
} as const;
