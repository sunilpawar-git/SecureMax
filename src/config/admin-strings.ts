/**
 * SSOT for all admin-specific strings and constants.
 * Extends the base config/strings.ts with admin panel vocabulary.
 * Every admin-facing string, status value, and error message lives here.
 */

export const ADMIN_ACTION_TYPE = {
  LEAD_STATUS_CHANGED: 'lead_status_changed',
  REPORT_REGENERATED: 'report_regenerated',
  REPORT_UNLOCKED: 'report_unlocked',
  SESSION_KILLED: 'session_killed',
  EMAIL_SENT: 'email_sent',
  THREAT_INTEL_ADDED: 'threat_intel_added',
  THREAT_INTEL_DELETED: 'threat_intel_deleted',
  THREAT_INTEL_RESTORED: 'threat_intel_restored',
  LINKEDIN_DRAFT_CREATED: 'linkedin_draft_created',
  LINKEDIN_POST_STATUS_CHANGED: 'linkedin_post_status_changed',
  LINKEDIN_POST_COPIED: 'linkedin_post_copied',
  LINKEDIN_POST_PUBLISHED: 'linkedin_post_published',
  LINKEDIN_POST_DELETED: 'linkedin_post_deleted',
  COUPON_CREATED: 'coupon_created',
  COUPON_BULK_CREATED: 'coupon_bulk_created',
  COUPON_REVOKED: 'coupon_revoked',
  LEAD_MARKED_PAID: 'lead_marked_paid',
  ADMIN_LOGIN: 'admin_login',
  ALERT_DIGEST_SENT: 'alert_digest_sent',
  API_KEY_ADD: 'api_key_add',
  API_KEY_ROTATE: 'api_key_rotate',
  API_KEY_REVOKE: 'api_key_revoke',
  API_KEY_IMPORT: 'api_key_import',
  NEWSLETTER_GENERATED: 'newsletter_generated',
  NEWSLETTER_PUBLISHED: 'newsletter_published',
  NEWSLETTER_DELETED: 'newsletter_deleted',
} as const;

export const ADMIN_ENTITY_TYPE = {
  LEAD: 'lead',
  SESSION: 'session',
  REPORT: 'report',
  THREAT_INTEL: 'threat_intel',
  LINKEDIN_POST: 'linkedin_post',
  COUPON: 'coupon',
  USER: 'user',
  ALERT: 'alert',
  API_KEY: 'api_key',
  NEWSLETTER: 'newsletter',
} as const;

export const LEAD_STATUS = {
  NEW: 'new',
  CONTACTED: 'contacted',
  PROPOSAL_SENT: 'proposal_sent',
  CLOSED_WON: 'closed_won',
  CLOSED_LOST: 'closed_lost',
} as const;

export const LEAD_STATUS_LABEL: Record<string, string> = {
  [LEAD_STATUS.NEW]: 'New',
  [LEAD_STATUS.CONTACTED]: 'Contacted',
  [LEAD_STATUS.PROPOSAL_SENT]: 'Proposal Sent',
  [LEAD_STATUS.CLOSED_WON]: 'Closed (Won)',
  [LEAD_STATUS.CLOSED_LOST]: 'Closed (Lost)',
} as const;

export const VALID_LEAD_TRANSITIONS: Record<string, readonly string[]> = {
  [LEAD_STATUS.NEW]: [LEAD_STATUS.CONTACTED],
  [LEAD_STATUS.CONTACTED]: [LEAD_STATUS.PROPOSAL_SENT, LEAD_STATUS.CLOSED_LOST],
  [LEAD_STATUS.PROPOSAL_SENT]: [LEAD_STATUS.CLOSED_WON, LEAD_STATUS.CLOSED_LOST],
  [LEAD_STATUS.CLOSED_WON]: [],
  [LEAD_STATUS.CLOSED_LOST]: [LEAD_STATUS.NEW],
} as const;

export const SCRAPER_RUN_STATUS = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const FOLLOW_UP_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  DISMISSED: 'dismissed',
} as const;

export const WEBHOOK_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
} as const;

export const REPORT_JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const ADMIN_ERR = {
  FORBIDDEN: 'Forbidden',
  LEAD_NOT_FOUND: 'Lead not found',
  LEAD_NO_EMAIL: 'Lead has no email address',
  SESSION_NOT_FOUND: 'Session not found',
  REPORT_NOT_FOUND: 'Report not found',
  REPORT_REGEN_FAILED: 'Report regeneration service unavailable',
  THREAT_INTEL_NOT_FOUND: 'Threat intel article not found',
  INVALID_STATUS_TRANSITION: 'Invalid status transition',
  REPORT_REGEN_IN_PROGRESS: 'Report regeneration already in progress',
  THREAT_INTEL_PROTECTED: 'Cannot delete article used in reports',
  DUPLICATE_URL: 'An article with this URL already exists',
  SESSION_ALREADY_CLOSED: 'Session is already closed or abandoned',
  INVALID_REQUEST: 'Invalid request body',
  SEARCH_QUERY_REQUIRED: 'Search query is required',
} as const;

export const MARK_PAID_STRINGS = {
  CTA: 'Mark Paid',
  DIALOG_TITLE: 'Mark lead as paid',
  DIALOG_BODY:
    'This unlocks the full enterprise report for the linked session. Confirm only after PO/invoice is received.',
  INVOICE_LABEL: 'Invoice / PO reference (optional)',
  INVOICE_PLACEHOLDER: 'e.g. INV-2026-041',
  CONFIRM: 'Confirm Paid',
  CANCEL: 'Cancel',
  PAID_BADGE: 'Paid',
  ERR_NO_SESSION: 'Lead has no linked audit session',
  ERR_ALREADY_PAID: 'Session is already paid',
  ERR_FAILED: 'Failed to mark lead as paid',
} as const;

export const HEALTH_STRINGS = {
  AI_UNREACHABLE:
    'AI service unreachable — drafts and reports will fail. Is the FastAPI service running (port 8000)?',
  AI_AUTH_FAILED:
    'AI service rejected the service key — check that AI_SERVICE_KEY matches in both .env files.',
  LINKEDIN_UNCONFIGURED:
    'LinkedIn posting is not configured — set LINKEDIN_ACCESS_TOKEN and LINKEDIN_ORG_ID to enable one-click posting.',
} as const;

export const LINKEDIN_STRINGS = {
  POST_BUTTON: 'Post to LinkedIn',
  // {status} is replaced with the upstream HTTP status at the call site
  DRAFT_UPSTREAM_ERROR: 'LinkedIn draft failed — AI service returned {status}. Check service logs.',
  POSTING: 'Posting...',
  POST_SUCCESS: 'Posted!',
  POST_ERROR: 'Posting failed — try again or copy manually.',
  ALREADY_POSTED: 'This draft was already posted to LinkedIn.',
  BOOKKEEPING_WARNING:
    'Posted to LinkedIn, but updating the queue failed — refresh before reposting.',
  REPOST: 'Repost',
  EDIT: 'Edit',
  DELETE: 'Delete',
  DELETE_CONFIRM: 'Delete this draft? It will be removed from the queue.',
  RETRY: 'Retry',
} as const;

export const LINKEDIN_POST_STATUS = {
  DRAFT: 'draft',
  COPIED: 'copied',
  PUBLISHED: 'published',
  POSTED: 'posted',
  DELETED: 'deleted',
} as const;

export const REPORTS_TABLE = {
  ACCESS_FREE: 'Free view available',
  ACCESS_PAID: 'Paid download',
} as const;

export const LEAD_CARD_STRINGS = {
  VIEW_PROPOSAL: 'View Proposal',
} as const;

// API Keys page strings live in api-keys-strings.ts (300-line gate);
// re-exported here so `@/config/admin-strings` stays the import path.
export { API_KEYS_STRINGS, LINKEDIN_TOKEN_WARN_AGE_DAYS } from './api-keys-strings';

// Analytics dashboard strings live in analytics-strings.ts (300-line gate);
// re-exported here so `@/config/admin-strings` stays the import path.
export { ANALYTICS_STRINGS } from './analytics-strings';

export const ALERT_STRINGS = {
  NEW_LEAD_SUBJECT: 'New Enterprise Lead — Raivan Global Admin',
  REPORT_DOWNLOAD_SUBJECT: 'Report Downloaded — Raivan Global Admin',
  OVERDUE_DIGEST_SUBJECT: 'Daily Digest: Overdue Follow-ups — Raivan Global Admin',
  SCRAPER_FAILURE_SUBJECT: 'Scraper Failure Alert — Raivan Global Admin',
  SCRAPER_ZERO_SUBJECT: 'Scraper Found 0 Articles — Raivan Global Admin',
} as const;

export const ADMIN_EMAIL_TEMPLATES = {
  PROPOSAL_SUBJECT: 'Your Security Audit Report is Ready — Raivan Global',
  PROPOSAL_BODY_PREFIX:
    'Thank you for completing the Raivan Global security audit questionnaire. Your detailed report is now available for download.',
  FOLLOW_UP_SUBJECT: 'Following Up — Raivan Global Security Audit',
} as const;

export const USERS_PAGE = {
  NAV_LABEL: 'Users',
  TITLE: 'Users',
  DESCRIPTION: 'All registered users and their audit activity',
  COL_USER: 'User',
  COL_TRACK: 'Track',
  COL_ROLE: 'Role',
  COL_SESSIONS: 'Sessions',
  COL_PAID: 'Paid',
  COL_LAST_ACTIVE: 'Last Active',
  COL_JOINED: 'Joined',
  FILTER_ALL_TRACKS: 'All Tracks',
  FILTER_SEARCH_PLACEHOLDER: 'Search by email or name…',
  EMPTY_STATE: 'No users found',
  NEVER: 'Never',
  PAID_NONE: '—',
  ROLE_ADMIN_LABEL: 'Admin',
  LOADING: 'Loading…',
  TOTAL_LABEL: 'users',
  PAGINATION_PREV: '← Previous',
  PAGINATION_NEXT: 'Next →',
  ERR_LOAD_FAILED: 'Failed to load users',
  ERR_INVALID_FILTER: 'Invalid filter parameters',
  COL_ACTION: 'Action',
  VIEW_SESSIONS: 'Sessions',
} as const;

export const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/scraper', label: 'Scraper' },
  { href: '/admin/knowledge-base', label: 'Knowledge Base' },
  { href: '/admin/leads', label: 'Enterprise Leads' },
  { href: '/admin/coupons', label: 'Coupons' },
  { href: '/admin/followup', label: 'HNI Follow-up' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/sessions', label: 'Sessions' },
  { href: '/admin/users', label: USERS_PAGE.NAV_LABEL },
  { href: '/admin/linkedin', label: 'LinkedIn' },
  { href: '/admin/newsletter', label: 'Newsletter' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/audit-log', label: 'Audit Log' },
  { href: '/admin/api-keys', label: 'API Keys' },
] as const;

export const FOLLOWUP_STRINGS = {
  PAGE_TITLE: 'HNI Follow-up',
  PAGE_DESCRIPTION: "Users who downloaded reports but haven't booked a physical audit",
  COL_USER: 'User',
  COL_DOWNLOADED: 'Downloaded At',
  COL_FOLLOWUP_DUE: 'Follow-up Due',
  COL_ACTION: 'Action',
  EMAIL_CTA: 'Send Email',
  WHATSAPP_CTA: 'WhatsApp (enter number manually)',
  WHATSAPP_CTA_DIRECT: 'WhatsApp',
  EMPTY_STATE: 'No pending follow-ups',
  UNKNOWN_USER: 'Unknown',
  LOAD_ERROR: 'Failed to load follow-up list',
  WHATSAPP_MESSAGE:
    "Hi! This is Raivan Global. We noticed you recently downloaded your security audit report. We'd love to discuss the findings and schedule a physical audit. When would be a good time?",
} as const;

// Coupon system strings live in coupon-strings.ts (300-line gate);
// re-exported here so `@/config/admin-strings` stays the import path.
export { COUPON_STRINGS, COUPON_ERR, COUPON_BULK_MAX } from './coupon-strings';

export {
  NEWSLETTER_STATUS,
  NEWSLETTER_POST_STATUS,
  NEWSLETTER_PLATFORMS,
  NEWSLETTER_STRINGS,
  type NewsletterPlatform,
} from './newsletter-strings';

export const FOLLOW_UP_DAYS = 7;

export const SEARCH_RESULTS_PER_TYPE = 5;

export const MANUAL_ARTICLE_RELEVANCE_SCORE = 1.0;

export const SCRAPER_SOURCE_OPTIONS = ['newsapi', 'rss', 'playwright', 'manual'] as const;

/**
 * Admin idle timeout — client-side guard only (P4: server-side role-specific
 * session maxAge documented in CLAUDE.md). Warning shows 2 minutes before
 * automatic sign-out at 30 minutes of inactivity.
 */
export const ADMIN_IDLE = {
  TIMEOUT_MS: 30 * 60_000,
  WARN_BEFORE_MS: 2 * 60_000,
  WARNING_MESSAGE: 'You will be signed out in 2 minutes due to inactivity.',
  STAY_SIGNED_IN: 'Stay signed in',
} as const;

export const SCRAPER_STRINGS = {
  SHOW_DELETED_TOGGLE: 'Show deleted articles',
  RESTORE_CTA: 'Restore',
  DELETED_BADGE: 'Deleted',
} as const;

export const SEARCH_DEBOUNCE_MS = 300;

export const ADMIN_PAGE_SIZE = 50;
