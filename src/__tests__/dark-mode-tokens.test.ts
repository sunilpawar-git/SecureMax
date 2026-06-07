/**
 * Dark mode tokens tests — Phase 2.
 * Verifies every style map in admin-colors.ts includes dark: variants.
 */

import {
  LEAD_STATUS_STYLES,
  SCRAPER_HEALTH_STYLES,
  SESSION_STATUS_STYLES,
  URGENCY_STYLES,
  URGENCY_BADGE_STYLES,
  FOLLOWUP_STATUS_STYLES,
  HEADER_STYLES,
  ADMIN_EXIT_LINK_STYLE,
  ACTION_TYPE_STYLES,
  PAID_STATUS_STYLES,
  ROLE_BADGE_STYLES,
  TRACK_BADGE_STYLES,
} from '@/config/admin-colors';

function assertAllValuesHaveDark(map: Record<string, string>, name: string) {
  for (const [key, value] of Object.entries(map)) {
    it(`${name}["${key}"] contains a dark: class`, () => {
      expect(value).toMatch(/dark:/);
    });
  }
}

function assertNoRawHex(map: Record<string, string>, name: string) {
  for (const [key, value] of Object.entries(map)) {
    it(`${name}["${key}"] has no raw hex colors`, () => {
      expect(value).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    });
  }
}

describe('HEADER_STYLES dark pairs', () => {
  it('full variant has dark:bg-slate-900', () => {
    expect(HEADER_STYLES.full).toContain('dark:bg-slate-900');
  });

  it('slim variant has dark:bg-slate-800', () => {
    expect(HEADER_STYLES.slim).toContain('dark:bg-slate-800');
  });

  it('both have dark border', () => {
    expect(HEADER_STYLES.full).toContain('dark:border-slate-700');
    expect(HEADER_STYLES.slim).toContain('dark:border-slate-700');
  });
});

describe('LEAD_STATUS_STYLES dark pairs', () => {
  assertAllValuesHaveDark(LEAD_STATUS_STYLES, 'LEAD_STATUS_STYLES');
  assertNoRawHex(LEAD_STATUS_STYLES, 'LEAD_STATUS_STYLES');
});

describe('SESSION_STATUS_STYLES dark pairs', () => {
  assertAllValuesHaveDark(SESSION_STATUS_STYLES, 'SESSION_STATUS_STYLES');
  assertNoRawHex(SESSION_STATUS_STYLES, 'SESSION_STATUS_STYLES');
});

describe('SCRAPER_HEALTH_STYLES dark pairs', () => {
  assertAllValuesHaveDark(SCRAPER_HEALTH_STYLES, 'SCRAPER_HEALTH_STYLES');
  assertNoRawHex(SCRAPER_HEALTH_STYLES, 'SCRAPER_HEALTH_STYLES');
});

describe('URGENCY_STYLES dark pairs', () => {
  assertAllValuesHaveDark(URGENCY_STYLES, 'URGENCY_STYLES');
  assertNoRawHex(URGENCY_STYLES, 'URGENCY_STYLES');
});

describe('URGENCY_BADGE_STYLES dark pairs', () => {
  assertAllValuesHaveDark(URGENCY_BADGE_STYLES, 'URGENCY_BADGE_STYLES');
});

describe('FOLLOWUP_STATUS_STYLES dark pairs', () => {
  assertAllValuesHaveDark(FOLLOWUP_STATUS_STYLES, 'FOLLOWUP_STATUS_STYLES');
});

describe('ACTION_TYPE_STYLES dark pairs', () => {
  assertAllValuesHaveDark(ACTION_TYPE_STYLES, 'ACTION_TYPE_STYLES');
  assertNoRawHex(ACTION_TYPE_STYLES, 'ACTION_TYPE_STYLES');
});

describe('PAID_STATUS_STYLES dark pairs', () => {
  assertAllValuesHaveDark(PAID_STATUS_STYLES, 'PAID_STATUS_STYLES');
});

describe('ROLE_BADGE_STYLES dark pairs', () => {
  assertAllValuesHaveDark(ROLE_BADGE_STYLES, 'ROLE_BADGE_STYLES');
});

describe('TRACK_BADGE_STYLES dark pairs', () => {
  assertAllValuesHaveDark(TRACK_BADGE_STYLES, 'TRACK_BADGE_STYLES');
});

describe('ADMIN_EXIT_LINK_STYLE', () => {
  it('contains dark: class', () => {
    expect(ADMIN_EXIT_LINK_STYLE).toMatch(/dark:/);
  });
});
