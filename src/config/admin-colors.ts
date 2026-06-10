/**
 * Admin-specific color tokens and Tailwind class maps.
 * All admin UI color decisions live here — no hardcoded classes in components.
 */

export const LEAD_STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  proposal_sent: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  closed_won: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  closed_lost: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export const SCRAPER_HEALTH_TEXT_STYLES: Record<string, string> = {
  healthy: 'text-green-700 dark:text-green-400',
  degraded: 'text-yellow-700 dark:text-yellow-400',
  failed: 'text-red-700 dark:text-red-400',
};

export const SCRAPER_HEALTH_STYLES: Record<string, string> = {
  healthy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  degraded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export const SESSION_STATUS_STYLES: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  abandoned: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export { TRACK_BADGE_STYLES } from './colors';

export const URGENCY_STYLES: Record<string, string> = {
  critical:
    'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
  warning:
    'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300',
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
};

export const URGENCY_BADGE_STYLES: Record<string, string> = {
  critical: 'bg-red-600 text-white dark:bg-red-700',
  warning: 'bg-amber-600 text-white dark:bg-amber-700',
  info: 'bg-blue-600 text-white dark:bg-blue-700',
};

export const FOLLOWUP_STATUS_STYLES: Record<string, string> = {
  overdue: 'bg-red-50 border-l-4 border-red-500 dark:bg-red-900/20',
  due_today: 'bg-amber-50 border-l-4 border-amber-500 dark:bg-amber-900/20',
  upcoming: 'bg-white dark:bg-slate-800',
};

export { HEADER_STYLES } from './colors';

// Admin nav links — inactive vs active (current route) states
export const ADMIN_NAV_LINK_STYLE =
  'text-sm text-gray-300 hover:text-white transition-colors whitespace-nowrap';

export const ADMIN_NAV_ACTIVE_LINK_STYLE =
  'text-sm text-white font-semibold border-b-2 border-blue-400 transition-colors whitespace-nowrap';

// Exit link in the admin nav — visually distinct from regular nav items
export const ADMIN_EXIT_LINK_STYLE =
  'text-xs text-slate-400 hover:text-white border border-slate-600 rounded px-2 py-1 transition-colors whitespace-nowrap dark:text-slate-500 dark:hover:text-white dark:border-slate-500';

export const ACTION_TYPE_STYLES: Record<string, string> = {
  lead_status_changed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  report_regenerated: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  report_unlocked: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  session_killed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  email_sent: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  threat_intel_added: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  threat_intel_deleted: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  threat_intel_restored: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
  linkedin_draft_created: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  linkedin_post_status_changed: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  linkedin_post_copied: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  linkedin_post_published: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  linkedin_post_deleted: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  coupon_created: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  coupon_bulk_created:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  coupon_revoked: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  lead_marked_paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  admin_login: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  alert_digest_sent: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  api_key_add: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
  api_key_rotate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  api_key_revoke: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  api_key_import: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
  newsletter_generated: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  newsletter_published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  newsletter_deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

// API key status badges
export const API_KEY_STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rotated: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  revoked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

// Draft queue per-row action buttons (Repost / Edit / Delete)
export const DRAFT_QUEUE_ACTIONS = {
  REPOST: 'px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 shrink-0',
  EDIT: 'px-3 py-1 text-xs font-medium bg-slate-600 text-white rounded hover:bg-slate-700 shrink-0',
  DELETE: 'px-3 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 shrink-0',
} as const;

// Coupon create modal success message ("coupon is live")
export const COUPON_SUCCESS_TEXT = 'text-sm text-green-700 dark:text-green-400';

// Coupon status badges — display status includes derived "expired"
export const COUPON_STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  redeemed: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  revoked: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

// Newsletter lifecycle badges
export const NEWSLETTER_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export const PAID_STATUS_STYLES = {
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  unpaid: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
} as const;

export const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

// Reports table "Access" cell text styles (paid vs free view)
export const ACCESS_TEXT_STYLES = {
  paid: 'text-green-600 dark:text-green-400',
  free: 'text-slate-400 dark:text-slate-500',
} as const;

// LinkedIn direct-post success badge
export const LINKEDIN_POST_SUCCESS_BADGE =
  'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';

// LinkedIn post bookkeeping warning (posted, but queue row update failed)
export const LINKEDIN_POST_WARNING_TEXT = 'text-amber-600 dark:text-amber-400';

// Service-health warning banner (admin pages)
export const HEALTH_WARNING_BANNER =
  'rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-sm text-amber-800 dark:text-amber-300';

// Coupons page action accents and filter chips
export const COUPON_PAGE_STYLES = {
  BULK_BTN:
    'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30',
  CREATE_BTN: 'bg-blue-600 text-white hover:bg-blue-700',
  FILTER_ACTIVE: 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  FILTER_INACTIVE:
    'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700',
  ERROR_BANNER: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
} as const;
