/**
 * Tests for admin string resources SSOT.
 */

import {
  ADMIN_ACTION_TYPE,
  ADMIN_ENTITY_TYPE,
  LEAD_STATUS,
  LEAD_STATUS_LABEL,
  VALID_LEAD_TRANSITIONS,
  SCRAPER_RUN_STATUS,
  FOLLOW_UP_STATUS,
  WEBHOOK_STATUS,
  REPORT_JOB_STATUS,
  ADMIN_ERR,
  ADMIN_EMAIL_TEMPLATES,
  ADMIN_NAV_ITEMS,
  FOLLOW_UP_DAYS,
  SEARCH_RESULTS_PER_TYPE,
  USERS_PAGE,
} from '@/config/admin-strings';

import {
  LEAD_STATUS_STYLES,
  SCRAPER_HEALTH_STYLES,
  SESSION_STATUS_STYLES,
  TRACK_BADGE_STYLES,
  ACTION_TYPE_STYLES,
  PAID_STATUS_STYLES,
  ROLE_BADGE_STYLES,
} from '@/config/admin-colors';

describe('Admin String Resources (SSOT)', () => {
  it('defines all admin action types', () => {
    const types = Object.values(ADMIN_ACTION_TYPE);
    expect(types).toContain('lead_status_changed');
    expect(types).toContain('report_regenerated');
    expect(types).toContain('report_unlocked');
    expect(types).toContain('session_killed');
    expect(types).toContain('email_sent');
    expect(types).toContain('threat_intel_added');
    expect(types).toContain('threat_intel_deleted');
    expect(types).toContain('linkedin_draft_created');
    expect(types).toContain('linkedin_post_status_changed');
    expect(types).toContain('linkedin_post_copied');
    expect(types.length).toBe(10);
  });

  it('defines all admin entity types', () => {
    const types = Object.values(ADMIN_ENTITY_TYPE);
    expect(types).toContain('lead');
    expect(types).toContain('session');
    expect(types).toContain('report');
    expect(types).toContain('threat_intel');
    expect(types).toContain('linkedin_post');
    expect(types.length).toBe(5);
  });

  it('defines all lead statuses with labels', () => {
    const statuses = Object.values(LEAD_STATUS);
    expect(statuses.length).toBe(5);
    for (const status of statuses) {
      expect(LEAD_STATUS_LABEL[status]).toBeDefined();
      expect(typeof LEAD_STATUS_LABEL[status]).toBe('string');
    }
  });

  it('defines valid lead transitions that prevent invalid jumps', () => {
    expect(VALID_LEAD_TRANSITIONS[LEAD_STATUS.NEW]).toContain(LEAD_STATUS.CONTACTED);
    expect(VALID_LEAD_TRANSITIONS[LEAD_STATUS.NEW]).not.toContain(LEAD_STATUS.PROPOSAL_SENT);
    expect(VALID_LEAD_TRANSITIONS[LEAD_STATUS.CONTACTED]).toContain(LEAD_STATUS.PROPOSAL_SENT);
    expect(VALID_LEAD_TRANSITIONS[LEAD_STATUS.CLOSED_WON]).toHaveLength(0);
    expect(VALID_LEAD_TRANSITIONS[LEAD_STATUS.CLOSED_LOST]).toContain(LEAD_STATUS.NEW);
  });

  it('defines scraper run statuses', () => {
    expect(Object.values(SCRAPER_RUN_STATUS)).toEqual(['running', 'completed', 'failed']);
  });

  it('defines follow-up statuses', () => {
    expect(Object.values(FOLLOW_UP_STATUS)).toEqual(['pending', 'completed', 'dismissed']);
  });

  it('defines webhook statuses', () => {
    expect(Object.values(WEBHOOK_STATUS)).toEqual(['success', 'failed']);
  });

  it('defines report job statuses', () => {
    expect(Object.values(REPORT_JOB_STATUS).length).toBe(4);
  });

  it('defines all admin error messages as non-empty strings', () => {
    for (const msg of Object.values(ADMIN_ERR)) {
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it('defines email templates', () => {
    expect(ADMIN_EMAIL_TEMPLATES.PROPOSAL_SUBJECT.length).toBeGreaterThan(0);
    expect(ADMIN_EMAIL_TEMPLATES.PROPOSAL_BODY_PREFIX.length).toBeGreaterThan(0);
    expect(ADMIN_EMAIL_TEMPLATES.FOLLOW_UP_SUBJECT.length).toBeGreaterThan(0);
  });

  it('defines admin nav items with valid hrefs', () => {
    expect(ADMIN_NAV_ITEMS.length).toBeGreaterThanOrEqual(7);
    for (const item of ADMIN_NAV_ITEMS) {
      expect(item.href).toMatch(/^\/admin/);
      expect(item.label.length).toBeGreaterThan(0);
    }
  });

  it('sets follow-up period to 7 days', () => {
    expect(FOLLOW_UP_DAYS).toBe(7);
  });

  it('caps search results per entity type', () => {
    expect(SEARCH_RESULTS_PER_TYPE).toBe(5);
  });
});

describe('Admin Color Tokens (SSOT)', () => {
  it('defines lead status styles for every lead status', () => {
    for (const status of Object.values(LEAD_STATUS)) {
      expect(LEAD_STATUS_STYLES[status]).toBeDefined();
      expect(LEAD_STATUS_STYLES[status]).toMatch(/^bg-/);
    }
  });

  it('defines scraper health styles', () => {
    expect(SCRAPER_HEALTH_STYLES['healthy']).toBeDefined();
    expect(SCRAPER_HEALTH_STYLES['degraded']).toBeDefined();
    expect(SCRAPER_HEALTH_STYLES['failed']).toBeDefined();
  });

  it('defines session status styles', () => {
    expect(SESSION_STATUS_STYLES['in_progress']).toBeDefined();
    expect(SESSION_STATUS_STYLES['completed']).toBeDefined();
    expect(SESSION_STATUS_STYLES['abandoned']).toBeDefined();
  });

  it('defines track badge styles for both tracks', () => {
    expect(TRACK_BADGE_STYLES['hni']).toBeDefined();
    expect(TRACK_BADGE_STYLES['enterprise']).toBeDefined();
  });

  it('defines action type styles for every admin action type', () => {
    for (const actionType of Object.values(ADMIN_ACTION_TYPE)) {
      expect(ACTION_TYPE_STYLES[actionType]).toBeDefined();
    }
  });
});

describe('USERS_PAGE string resources', () => {
  it('defines all required string keys', () => {
    expect(USERS_PAGE.NAV_LABEL).toBeDefined();
    expect(USERS_PAGE.TITLE).toBeDefined();
    expect(USERS_PAGE.DESCRIPTION).toBeDefined();
    expect(USERS_PAGE.EMPTY_STATE).toBeDefined();
    expect(USERS_PAGE.NEVER).toBeDefined();
    expect(USERS_PAGE.LOADING).toBeDefined();
    expect(USERS_PAGE.TOTAL_LABEL).toBeDefined();
    expect(USERS_PAGE.ERR_LOAD_FAILED).toBeDefined();
    expect(USERS_PAGE.ERR_INVALID_FILTER).toBeDefined();
    expect(USERS_PAGE.PAGINATION_PREV).toBeDefined();
    expect(USERS_PAGE.PAGINATION_NEXT).toBeDefined();
  });

  it('NAV_LABEL matches the label in ADMIN_NAV_ITEMS for /admin/users', () => {
    const usersNavItem = ADMIN_NAV_ITEMS.find((item) => item.href === '/admin/users');
    expect(usersNavItem).toBeDefined();
    expect(usersNavItem?.label).toBe(USERS_PAGE.NAV_LABEL);
  });
});

describe('Admin color token completeness', () => {
  it('PAID_STATUS_STYLES defines paid and unpaid keys', () => {
    expect(PAID_STATUS_STYLES.paid).toBeDefined();
    expect(PAID_STATUS_STYLES.unpaid).toBeDefined();
  });

  it('ROLE_BADGE_STYLES defines admin key', () => {
    expect(ROLE_BADGE_STYLES['admin']).toBeDefined();
  });
});
