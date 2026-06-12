/**
 * SSOT for the admin analytics dashboard — metric labels, funnel stages,
 * empty states. Split out of admin-strings.ts (300-line gate), following the
 * report-strings / landing-strings precedent. Re-exported from
 * admin-strings.ts so `@/config/admin-strings` stays the import path.
 */

export const ANALYTICS_STRINGS = {
  TITLE: 'Analytics',
  LOADING: 'Loading analytics...',
  LOAD_ERROR: 'Failed to load analytics',
  // Base KPI cards
  KPI: {
    TOTAL_SESSIONS: 'Total Sessions',
    COMPLETED: 'Completed',
    COMPLETION_RATE: 'Completion Rate',
    AVG_QUESTIONS: 'Avg Questions / Session',
    PAID_REPORTS: 'Paid Reports',
    REVENUE_INR: 'Revenue (INR)',
    CONVERSION_RATE: 'Conversion Rate',
  },
  // Domain + trends sections
  DOMAIN_TITLE: 'Domain Performance',
  DOMAIN_AVG_SCORE: 'Avg Score',
  DOMAIN_QUESTIONS_SUFFIX: 'questions',
  TRENDS_TITLE: 'Session Trends (Last 30 Days)',
  TRENDS_SESSIONS_SUFFIX: 'sessions',
  // Revenue split (Razorpay vs coupon vs manual unlock)
  REVENUE_SPLIT_TITLE: 'Payment Split',
  RAZORPAY_PAID: 'Razorpay Payments',
  COUPON_PAID: 'Coupon Redemptions',
  MANUAL_PAID: 'Manual Unlocks',
  TOTAL_PAID: 'Total Paid Sessions',
  // Funnel
  FUNNEL_TITLE: 'Conversion Funnel',
  // First stage is "Signed Up", not "Visited" — there is no landing-page
  // visitor analytics yet. Hook a GA4/Plausible stage in here when added.
  FUNNEL_STAGES: {
    SIGNED_UP: 'Signed Up',
    STARTED: 'Started Session',
    COMPLETED: 'Completed Session',
    PAID: 'Paid',
    DOWNLOADED: 'Downloaded Report',
  },
  FUNNEL_DROP_PREFIX: 'drop-off',
  FUNNEL_EMPTY: 'No funnel data yet.',
  // Session health
  HEALTH_TITLE: 'Session Health',
  AVG_COMPLETION: 'Avg Completion Time',
  ABANDONMENT_TITLE: 'Top Abandonment Points',
  ABANDONMENT_EMPTY: 'No abandoned sessions — nothing to show.',
  SESSIONS_SUFFIX: 'sessions',
  // LinkedIn ROI
  ROI_TITLE: 'LinkedIn Activity vs Signups (8 Weeks)',
  ROI_SUBTITLE: 'Parallel time series — correlation signal, not causation.',
  ROI_POSTS: 'Posts',
  ROI_SIGNUPS: 'Signups',
  ROI_EMPTY: 'No LinkedIn or signup activity in the last 8 weeks.',
  WEEK_PREFIX: 'Week of',
} as const;
