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

export const ENTERPRISE_LEAD_STATUS = {
  NEW: 'new',
  CONTACTED: 'contacted',
  PROPOSAL_SENT: 'proposal_sent',
  CLOSED: 'closed',
} as const;

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
