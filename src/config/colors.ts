/**
 * Universal color scheme — SSOT for design tokens.
 * Used in Tailwind config and component styles.
 * All color decisions live here.
 */

import { SEVERITY } from './strings';

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

/**
 * Audit-finding severity badge tokens. Relocated from FindingCard.tsx so the
 * Badge primitive and FindingCard read one source (SSOT). Each pair is WCAG AA
 * (≥4.5:1) in both light and dark: e.g. red-800-on-red-100 ≈ 7:1,
 * red-300-on-red-900/30 ≈ 6:1.
 */
export const SEVERITY_STYLES: Record<string, string> = {
  [SEVERITY.CRITICAL]:
    'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  [SEVERITY.HIGH]:
    'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
  [SEVERITY.MEDIUM]:
    'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
  [SEVERITY.LOW]:
    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
};

/**
 * Button primitive tokens (src/components/ui/Button.tsx). `base` holds layout +
 * focus-ring geometry (no color); each `variant` carries its own AA-verified
 * color pair + ring color. Touch targets ≥44px (md) / 48px (lg) per WCAG 2.5.5.
 *
 * Contrast (text vs bg, light → dark):
 *   primary     white on emerald-700 ≈ 5.5:1  (both modes)
 *   secondary   slate-900 on white ≈ 17:1 / slate-100 on slate-800 ≈ 14:1
 *   ghost       slate-700 on transparent (white) ≈ 8.6:1 / slate-200 on slate-900
 *   destructive white on red-600 ≈ 4.8:1 / white on red-700 ≈ 6:1
 */
export const BUTTON_STYLES = {
  base:
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
    'ring-offset-white dark:ring-offset-slate-900 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed',
  variant: {
    primary:
      'bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:ring-emerald-600 ' +
      'dark:bg-emerald-700 dark:hover:bg-emerald-800',
    secondary:
      'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400 ' +
      'dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700',
    ghost:
      'bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400 ' +
      'dark:text-slate-200 dark:hover:bg-slate-800',
    destructive:
      'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 ' +
      'dark:bg-red-700 dark:hover:bg-red-800',
  },
  size: {
    sm: 'min-h-[36px] px-3 text-sm',
    md: 'min-h-[44px] px-4 text-sm',
    lg: 'min-h-[48px] px-6 text-base',
  },
} as const;

/** Card primitive tokens (src/components/ui/Card.tsx). Keys map 1:1 to the `variant` prop. */
export const CARD_STYLES = {
  default:
    'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800',
  flat: 'rounded-xl bg-slate-50 dark:bg-slate-800/60',
} as const;

/** Badge primitive color tokens (src/components/ui/Badge.tsx). All pairs WCAG AA in both modes. */
export const BADGE_STYLES = {
  emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
} as const;
