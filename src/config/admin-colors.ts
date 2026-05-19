/**
 * Admin-specific color tokens and Tailwind class maps.
 * Extends the base COLORS from config/colors.ts.
 * All admin UI color decisions live here — no hardcoded classes in components.
 */

import { COLORS } from './colors';

export const ADMIN_COLORS = {
  nav: {
    bg: COLORS.dark.background,
    text: COLORS.dark.text,
    textMuted: COLORS.text.muted,
    hover: COLORS.text.inverse,
  },
  badge: {
    bg: COLORS.severity.critical,
    text: COLORS.text.inverse,
  },
  kanban: {
    columnBg: COLORS.surface.card,
    cardBg: COLORS.surface.background,
    cardBorder: COLORS.surface.border,
    cardHover: COLORS.surface.hover,
    overdueBorder: COLORS.severity.high,
  },
} as const;

export const LEAD_STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  proposal_sent: 'bg-indigo-100 text-indigo-800',
  closed_won: 'bg-green-100 text-green-800',
  closed_lost: 'bg-gray-100 text-gray-800',
};

export const SCRAPER_HEALTH_STYLES: Record<string, string> = {
  healthy: 'bg-green-100 text-green-800',
  degraded: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
};

export const SESSION_STATUS_STYLES: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  abandoned: 'bg-gray-100 text-gray-800',
};

export { TRACK_BADGE_STYLES } from './colors';

export const URGENCY_STYLES: Record<string, string> = {
  critical: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

export const URGENCY_BADGE_STYLES: Record<string, string> = {
  critical: 'bg-red-600 text-white',
  warning: 'bg-amber-600 text-white',
  info: 'bg-blue-600 text-white',
};

export const FOLLOWUP_STATUS_STYLES: Record<string, string> = {
  overdue: 'bg-red-50 border-l-4 border-red-500',
  due_today: 'bg-amber-50 border-l-4 border-amber-500',
  upcoming: 'bg-white',
};

export const HEADER_STYLES = {
  full: 'bg-white border-b border-slate-200',
  slim: 'bg-slate-50 border-b border-slate-200',
} as const;

export const ACTION_TYPE_STYLES: Record<string, string> = {
  lead_status_changed: 'bg-blue-100 text-blue-800',
  report_regenerated: 'bg-purple-100 text-purple-800',
  report_unlocked: 'bg-green-100 text-green-800',
  session_killed: 'bg-red-100 text-red-800',
  email_sent: 'bg-cyan-100 text-cyan-800',
  threat_intel_added: 'bg-indigo-100 text-indigo-800',
  threat_intel_deleted: 'bg-orange-100 text-orange-800',
};
