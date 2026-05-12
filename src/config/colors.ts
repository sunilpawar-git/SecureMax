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
  },
} as const;

export type ColorToken = typeof COLORS;
