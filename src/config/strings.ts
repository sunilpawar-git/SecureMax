/**
 * SSOT for all user-facing strings and constants.
 * No magic strings anywhere in the codebase.
 */

export const APP = {
  NAME: 'Raivan Global',
  TAGLINE: 'Security gaps you didn\u2019t know existed',
  DESCRIPTION:
    'AI-driven physical security audit for HNIs and enterprises, grounded in CPP Seven Precis methodology.',
  URL: 'https://raivanglobal.com',
  SUPPORT_EMAIL: 'support@raivanglobal.com',
} as const;

export const CTA = {
  HNI: 'Audit My Residence',
  ENTERPRISE: 'Audit My Facility',
  WHATSAPP: 'Book a Physical Audit',
  CALENDAR: 'Schedule a Consultation',
  ENTERPRISE_PROPOSAL: 'Request Enterprise Proposal',
  DOWNLOAD_SAMPLE: 'Download Sample Enterprise Report',
} as const;

export const TRACK = {
  HNI: 'hni',
  ENTERPRISE: 'enterprise',
} as const;

export const TRACK_LABEL: Record<string, string> = {
  [TRACK.HNI]: 'HNI',
  [TRACK.ENTERPRISE]: 'Enterprise',
};

export const USER_ROLE = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export const CPP_DOMAINS = {
  CPP_01: { code: 'CPP-01', name: 'Physical Security' },
  CPP_02: { code: 'CPP-02', name: 'Business Principles' },
  CPP_03: { code: 'CPP-03', name: 'Crisis Management' },
  CPP_04: { code: 'CPP-04', name: 'Investigations' },
  CPP_05: { code: 'CPP-05', name: 'Information Security' },
  CPP_06: { code: 'CPP-06', name: 'Personnel Security' },
  CPP_07: { code: 'CPP-07', name: 'Security Management' },
} as const;

export const SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export const SESSION_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
} as const;

/**
 * @deprecated Use LEAD_STATUS from '@/config/admin-strings' — canonical 5-stage pipeline.
 * Kept here as a re-export alias so existing imports don't break.
 */
export { LEAD_STATUS as ENTERPRISE_LEAD_STATUS } from './admin-strings';

export const LINKEDIN_POST_STATUS = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  POSTED: 'posted',
} as const;

export const TRUST_STACK = {
  HNI_PRIVACY:
    'Your answers are encrypted end-to-end. We never collect your property address or location. This report is private to you.',
  ENTERPRISE_SOVEREIGNTY:
    'All data is stored on India-hosted servers. Access is restricted to your account.',
  METHODOLOGY: 'CPP Seven Precis Methodology',
  CREDENTIAL: 'Raivan Global \u2014 Registered Security Consultancy',
  ESTIMATED_TIME: '~12 minutes',
  COMPLIANCE_SIGNAL: 'Our findings map to ISO 27001 Annex A.11, PSARA, and BIS/IS standards.',
  VENDOR_POSITIONING:
    'We work alongside your existing security agency. This report becomes a gap brief for them.',
} as const;

export const LIMITS = {
  MAX_SESSIONS_PER_USER_PER_MONTH: 3,
  AI_RATE_LIMIT_SECONDS: 15,
  MAX_QUESTIONS_PER_SESSION: 60,
  MIN_QUESTIONS_PER_SESSION: 20,
  EMBEDDING_CHUNK_TOKENS: 400,
  EMBEDDING_OVERLAP_TOKENS: 50,
  EMBEDDING_DIMENSIONS: 768,
} as const;

export const PAYMENT = {
  CURRENCY: 'INR',
  AMOUNT_PAISE: 499900,
  MIN_AMOUNT_PAISE: 499900,
  MAX_AMOUNT_PAISE: 999900,
} as const;

export const RADAR_THRESHOLDS = {
  GREEN_MIN: 70,
  AMBER_MIN: 40,
} as const;

export const VALID_TRACKS = [TRACK.HNI, TRACK.ENTERPRISE] as const;

export const LIMITS_ERR = {
  SESSION_CAP_REACHED:
    'You have reached the maximum number of sessions this month. Please try again next month.',
} as const;

/** SSOT for input-validation messages shared across API route schemas. */
export const VALIDATION_ERR = {
  INVALID_BODY: 'Invalid or missing JSON body',
  INVALID_TRACK: 'Invalid audit track',
  INVALID_SESSION_ID: 'Invalid session identifier',
  REQUIRED_QUESTION_ID: 'question_id is required',
  REQUIRED_ANSWER: 'answer is required',
  REQUIRED_REPORT_ID: 'report_id is required',
  REQUIRED_ORDER_ID: 'razorpay_order_id is required',
  REQUIRED_PAYMENT_ID: 'razorpay_payment_id is required',
  REQUIRED_SIGNATURE: 'razorpay_signature is required',
  REQUIRED_COMPANY_NAME: 'Company name is required',
  REQUIRED_CONTACT_NAME: 'Contact name is required',
  REQUIRED_EMAIL: 'Valid email is required',
} as const;

export const PAYMENT_ERR = {
  GATEWAY_LOADING: 'Payment gateway is loading. Please try again in a moment.',
} as const;

export const NAV = {
  DASHBOARD: 'Dashboard',
  START_AUDIT: 'New Assessment',
  SAVE_EXIT: 'Save & Exit',
  SIGN_OUT: 'Sign Out',
  SIGN_IN: 'Sign In',
  EXIT_ADMIN: '← Exit Admin',
} as const;

export const RESUME = {
  TITLE: 'You have an assessment in progress',
  DESCRIPTION: 'Would you like to continue where you left off or start a fresh assessment?',
  RESUME_BTN: 'Resume Session',
  RESTART_BTN: 'Start Fresh',
  RESTART_CONFIRM: 'Starting fresh will abandon your current progress. Are you sure?',
  QUESTIONS_ANSWERED: 'questions answered',
} as const;

export const UI = {
  LOADING: 'Loading...',
} as const;

export const CAPTCHA = {
  FAILED: 'CAPTCHA verification failed. Please try again.',
  PROMPT: 'Please complete the verification below.',
} as const;

export const DASHBOARD = {
  SUBTITLE: 'Your security assessments',
  EMPTY_STATE: 'No assessments yet. Start one above.',
  QUESTIONS_SUFFIX: 'questions',
} as const;

export const QUESTIONNAIRE = {
  TRACK_PROMPT: 'Select your audit track to begin the security assessment.',
  COMPLETE_TITLE: 'Assessment Complete',
  REPORT_GENERATING: 'Your report is being generated.',
  REPORT_INITIATING: 'Initiating report generation...',
  VIEW_REPORT_STATUS: 'View Report Status',
  SECURITY_SCORE: 'Security Score',
  RESUME_EXISTING: 'Resume existing session',
} as const;

export const SESSION_STATUS_LABEL: Record<string, string> = {
  [SESSION_STATUS.IN_PROGRESS]: 'In Progress',
  [SESSION_STATUS.COMPLETED]: 'Completed',
  [SESSION_STATUS.ABANDONED]: 'Abandoned',
};

export const DPDPA = {
  CONSENT_VERSION: 'v1',
  CONSENT_PURPOSE: 'security_audit_processing',
  CONSENT_DESCRIPTION:
    'Processing of personal data for AI-driven physical security audit, report generation, and threat intelligence enrichment under DPDPA 2023.',
} as const;
