/**
 * Universal color scheme — SSOT for design tokens.
 * Used in Tailwind config and component styles.
 * All color decisions live here.
 */

export const COLORS = {
  brand: {
    primary: '#0F172A',
    secondary: '#1E40AF',
    accent: '#3B82F6',
    muted: '#94A3B8',
  },
  surface: {
    background: '#FFFFFF',
    card: '#F8FAFC',
    border: '#E2E8F0',
    hover: '#F1F5F9',
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    muted: '#94A3B8',
    inverse: '#FFFFFF',
  },
  severity: {
    critical: '#DC2626',
    high: '#EA580C',
    medium: '#D97706',
    low: '#2563EB',
  },
  radar: {
    green: '#16A34A',
    amber: '#D97706',
    red: '#DC2626',
  },
  status: {
    success: '#16A34A',
    warning: '#D97706',
    error: '#DC2626',
    info: '#2563EB',
  },
  dark: {
    background: '#0F172A',
    card: '#1E293B',
    border: '#334155',
    text: '#E2E8F0',
    hover: '#334155',
  },
} as const;

export type ColorToken = typeof COLORS;

/**
 * Authenticated app header style tokens — used by AppHeader on dashboard/report/questionnaire pages.
 */
export const HEADER_STYLES = {
  full: 'bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-700',
  slim: 'bg-slate-50 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700',
} as const;

/**
 * Landing page header style tokens — public-facing, no session context.
 * Separate from HEADER_STYLES (which is for authenticated app pages).
 */
export const LANDING_HEADER_STYLES = {
  header: 'absolute inset-x-0 top-0 z-10',
  nav: 'mx-auto max-w-4xl flex items-center justify-between px-6 py-5',
  logo: 'text-sm font-bold text-white hover:text-slate-200 transition-colors',
  signInLink:
    'rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors',
} as const;

export const TRACK_BADGE_STYLES: Record<string, string> = {
  hni: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  enterprise: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
};
