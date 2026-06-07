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
  LINKEDIN_DRAFT_CREATED: 'linkedin_draft_created',
  LINKEDIN_POST_STATUS_CHANGED: 'linkedin_post_status_changed',
  LINKEDIN_POST_COPIED: 'linkedin_post_copied',
} as const;

export const ADMIN_ENTITY_TYPE = {
  LEAD: 'lead',
  SESSION: 'session',
  REPORT: 'report',
  THREAT_INTEL: 'threat_intel',
  LINKEDIN_POST: 'linkedin_post',
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
} as const;

export const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/scraper', label: 'Scraper' },
  { href: '/admin/leads', label: 'Enterprise Leads' },
  { href: '/admin/followup', label: 'HNI Follow-up' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/sessions', label: 'Sessions' },
  { href: '/admin/users', label: USERS_PAGE.NAV_LABEL },
  { href: '/admin/linkedin', label: 'LinkedIn' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/audit-log', label: 'Audit Log' },
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
  EMPTY_STATE: 'No pending follow-ups',
  UNKNOWN_USER: 'Unknown',
  LOAD_ERROR: 'Failed to load follow-up list',
  WHATSAPP_MESSAGE:
    "Hi! This is Raivan Global. We noticed you recently downloaded your security audit report. We'd love to discuss the findings and schedule a physical audit. When would be a good time?",
} as const;

export const FOLLOW_UP_DAYS = 7;

export const SEARCH_RESULTS_PER_TYPE = 5;

export const MANUAL_ARTICLE_RELEVANCE_SCORE = 1.0;

export const SCRAPER_SOURCE_OPTIONS = ['newsapi', 'rss', 'playwright', 'manual'] as const;

export const SEARCH_DEBOUNCE_MS = 300;

export const ADMIN_PAGE_SIZE = 50;
