/**
 * Phase 0 tests — verify config SSOT integrity.
 * Every constant module must be importable and structurally sound.
 */

import {
  APP,
  CTA,
  TRACK,
  USER_ROLE,
  CPP_DOMAINS,
  SEVERITY,
  SESSION_STATUS,
  ENTERPRISE_LEAD_STATUS,
  LINKEDIN_POST_STATUS,
  TRUST_STACK,
  LIMITS,
  PAYMENT,
  RADAR_THRESHOLDS,
  COLORS,
  SECURITY_HEADERS,
  RATE_LIMITS,
  ENCRYPTION,
  UI,
  DASHBOARD,
  QUESTIONNAIRE,
  SESSION_STATUS_LABEL,
} from '@/config';

describe('String resources (SSOT)', () => {
  it('APP has required brand fields', () => {
    expect(APP.NAME).toBe('Raivan Global');
    expect(APP.TAGLINE).toBeTruthy();
    expect(APP.SUPPORT_EMAIL).toContain('@');
  });

  it('CTA has both track labels', () => {
    expect(CTA.HNI).toBeTruthy();
    expect(CTA.ENTERPRISE).toBeTruthy();
  });

  it('TRACK enum has exactly two values', () => {
    expect(Object.values(TRACK)).toHaveLength(2);
    expect(TRACK.HNI).toBe('hni');
    expect(TRACK.ENTERPRISE).toBe('enterprise');
  });

  it('USER_ROLE enum has exactly two values', () => {
    expect(Object.values(USER_ROLE)).toHaveLength(2);
  });

  it('CPP_DOMAINS has all 7 domains', () => {
    const domains = Object.values(CPP_DOMAINS);
    expect(domains).toHaveLength(7);
    domains.forEach((d) => {
      expect(d.code).toMatch(/^CPP-0[1-7]$/);
      expect(d.name).toBeTruthy();
    });
  });

  it('SEVERITY has 4 levels', () => {
    expect(Object.values(SEVERITY)).toHaveLength(4);
  });

  it('SESSION_STATUS has 3 states', () => {
    expect(Object.values(SESSION_STATUS)).toHaveLength(3);
  });

  it('ENTERPRISE_LEAD_STATUS has 5 pipeline stages (canonical LEAD_STATUS)', () => {
    expect(Object.values(ENTERPRISE_LEAD_STATUS)).toHaveLength(5);
  });

  it('LINKEDIN_POST_STATUS has 3 states', () => {
    expect(Object.values(LINKEDIN_POST_STATUS)).toHaveLength(3);
  });
});

describe('Trust stack strings', () => {
  it('HNI privacy statement mentions encryption', () => {
    expect(TRUST_STACK.HNI_PRIVACY.toLowerCase()).toContain('encrypted');
  });

  it('HNI privacy statement does not contradict the city/country collected at onboarding', () => {
    expect(TRUST_STACK.HNI_PRIVACY.toLowerCase()).not.toContain(
      'we never collect your property address or location',
    );
  });

  it('enterprise sovereignty mentions India', () => {
    expect(TRUST_STACK.ENTERPRISE_SOVEREIGNTY.toLowerCase()).toContain('india');
  });
});

describe('Limits', () => {
  it('session limits are within plan spec', () => {
    expect(LIMITS.MAX_SESSIONS_PER_USER_PER_MONTH).toBe(3);
    expect(LIMITS.AI_RATE_LIMIT_SECONDS).toBe(15);
    expect(LIMITS.MAX_QUESTIONS_PER_SESSION).toBe(60);
    expect(LIMITS.MIN_QUESTIONS_PER_SESSION).toBe(20);
  });

  it('embedding config matches Gemini text-embedding-004', () => {
    expect(LIMITS.EMBEDDING_DIMENSIONS).toBe(768);
    expect(LIMITS.EMBEDDING_CHUNK_TOKENS).toBe(400);
    expect(LIMITS.EMBEDDING_OVERLAP_TOKENS).toBe(50);
  });
});

describe('Payment config', () => {
  it('currency is INR', () => {
    expect(PAYMENT.CURRENCY).toBe('INR');
  });

  it('report unlock price is ₹4,999 in paise', () => {
    expect(PAYMENT.AMOUNT_PAISE).toBe(499900);
  });
});

describe('Color scheme', () => {
  it('has all required color groups', () => {
    expect(COLORS.brand).toBeDefined();
    expect(COLORS.surface).toBeDefined();
    expect(COLORS.text).toBeDefined();
    expect(COLORS.severity).toBeDefined();
    expect(COLORS.radar).toBeDefined();
    expect(COLORS.status).toBeDefined();
    expect(COLORS.dark).toBeDefined();
  });

  it('severity colors are distinct', () => {
    const { critical, high, medium, low } = COLORS.severity;
    const unique = new Set([critical, high, medium, low]);
    expect(unique.size).toBe(4);
  });

  it('radar thresholds are consistent', () => {
    expect(RADAR_THRESHOLDS.GREEN_MIN).toBeGreaterThan(RADAR_THRESHOLDS.AMBER_MIN);
  });
});

describe('UI SSOT strings', () => {
  it('UI.LOADING is defined', () => {
    expect(UI.LOADING).toBe('Loading...');
  });

  it('DASHBOARD has all required strings', () => {
    expect(DASHBOARD.SUBTITLE).toBeTruthy();
    expect(DASHBOARD.EMPTY_STATE).toBeTruthy();
    expect(DASHBOARD.QUESTIONS_SUFFIX).toBeTruthy();
  });

  it('QUESTIONNAIRE has all required strings', () => {
    expect(QUESTIONNAIRE.TRACK_PROMPT).toBeTruthy();
    expect(QUESTIONNAIRE.COMPLETE_TITLE).toBeTruthy();
    expect(QUESTIONNAIRE.REPORT_GENERATING).toBeTruthy();
    expect(QUESTIONNAIRE.VIEW_REPORT_STATUS).toBeTruthy();
    expect(QUESTIONNAIRE.SECURITY_SCORE).toBeTruthy();
  });

  it('SESSION_STATUS_LABEL has labels for all statuses', () => {
    expect(SESSION_STATUS_LABEL[SESSION_STATUS.IN_PROGRESS]).toBe('In Progress');
    expect(SESSION_STATUS_LABEL[SESSION_STATUS.COMPLETED]).toBe('Completed');
    expect(SESSION_STATUS_LABEL[SESSION_STATUS.ABANDONED]).toBe('Abandoned');
  });
});

describe('Security config', () => {
  it('security headers prevent framing', () => {
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
  });

  it('HSTS is set with preload', () => {
    expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain('preload');
  });

  it('rate limits are positive integers', () => {
    expect(RATE_LIMITS.AI_ENDPOINT_WINDOW_MS).toBeGreaterThan(0);
    expect(RATE_LIMITS.GLOBAL_MAX_REQUESTS).toBeGreaterThan(0);
  });

  it('encryption uses AES-256-GCM', () => {
    expect(ENCRYPTION.ALGORITHM).toBe('aes-256-gcm');
    expect(ENCRYPTION.KEY_LENGTH).toBe(32);
  });

  it('ENCRYPTION.KEY_VERSION_PREFIX exists and is non-empty', () => {
    expect(ENCRYPTION.KEY_VERSION_PREFIX).toBeDefined();
    expect(ENCRYPTION.KEY_VERSION_PREFIX.length).toBeGreaterThan(0);
    expect(ENCRYPTION.KEY_VERSION_PREFIX).toBe('v1:');
  });
});
