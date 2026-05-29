/**
 * Phase 3 tests — Admin HNI follow-up dashboard.
 * Verifies SSOT strings, service layer, WhatsApp URL builder, API route contract.
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    auditSession: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

import { FOLLOWUP_STRINGS, ADMIN_NAV_ITEMS } from '@/config/admin-strings';
import { FOLLOWUP_STATUS_STYLES } from '@/config/admin-colors';

describe('FOLLOWUP_STRINGS', () => {
  it('has all required strings', () => {
    expect(FOLLOWUP_STRINGS.PAGE_TITLE).toBeTruthy();
    expect(FOLLOWUP_STRINGS.PAGE_DESCRIPTION).toBeTruthy();
    expect(FOLLOWUP_STRINGS.COL_USER).toBeTruthy();
    expect(FOLLOWUP_STRINGS.COL_DOWNLOADED).toBeTruthy();
    expect(FOLLOWUP_STRINGS.COL_FOLLOWUP_DUE).toBeTruthy();
    expect(FOLLOWUP_STRINGS.COL_ACTION).toBeTruthy();
    expect(FOLLOWUP_STRINGS.EMAIL_CTA).toBeTruthy();
    expect(FOLLOWUP_STRINGS.WHATSAPP_CTA).toBeTruthy();
    expect(FOLLOWUP_STRINGS.EMPTY_STATE).toBeTruthy();
    expect(FOLLOWUP_STRINGS.WHATSAPP_MESSAGE).toBeTruthy();
  });

  it('has no empty values', () => {
    Object.values(FOLLOWUP_STRINGS).forEach((val) => {
      expect(val.trim().length).toBeGreaterThan(0);
    });
  });

  it('WhatsApp message uses ASCII apostrophes only', () => {
    expect(FOLLOWUP_STRINGS.WHATSAPP_MESSAGE).not.toMatch(/[\u2018\u2019\u201C\u201D]/);
  });
});

describe('ADMIN_NAV_ITEMS includes /admin/followup', () => {
  it('has HNI Follow-up nav item', () => {
    const followupItem = ADMIN_NAV_ITEMS.find((item) => item.href === '/admin/followup');
    expect(followupItem).toBeDefined();
    expect(followupItem!.label).toBe('HNI Follow-up');
  });

  it('Follow-up comes after Enterprise Leads and before Reports', () => {
    const labels = ADMIN_NAV_ITEMS.map((item) => item.label);
    const leadsIdx = labels.indexOf('Enterprise Leads');
    const followupIdx = labels.indexOf('HNI Follow-up');
    const reportsIdx = labels.indexOf('Reports');
    expect(followupIdx).toBeGreaterThan(leadsIdx);
    expect(followupIdx).toBeLessThan(reportsIdx);
  });
});

describe('FOLLOWUP_STATUS_STYLES', () => {
  it('has overdue, due_today, upcoming styles', () => {
    expect(FOLLOWUP_STATUS_STYLES.overdue).toBeTruthy();
    expect(FOLLOWUP_STATUS_STYLES.due_today).toBeTruthy();
    expect(FOLLOWUP_STATUS_STYLES.upcoming).toBeTruthy();
  });

  it('overdue has red styling', () => {
    expect(FOLLOWUP_STATUS_STYLES.overdue).toContain('red');
  });
});

describe('followup-service module contract', () => {
  it('exports getFollowUpList', () => {
    const mod = require('@/lib/admin/followup-service');
    expect(mod.getFollowUpList).toBeDefined();
    expect(typeof mod.getFollowUpList).toBe('function');
  });

  it('exports buildWhatsAppUrl', () => {
    const mod = require('@/lib/admin/followup-service');
    expect(mod.buildWhatsAppUrl).toBeDefined();
    expect(typeof mod.buildWhatsAppUrl).toBe('function');
  });

  it('buildWhatsAppUrl returns correctly encoded URL', () => {
    const { buildWhatsAppUrl } = require('@/lib/admin/followup-service');
    const url = buildWhatsAppUrl('919876543210');
    expect(url).toContain('https://wa.me/919876543210');
    expect(url).toContain('text=');
    expect(url).not.toContain(' ');
  });

  it('exports computeFollowUpStatus', () => {
    const mod = require('@/lib/admin/followup-service');
    expect(mod.computeFollowUpStatus).toBeDefined();
  });

  it('computeFollowUpStatus returns overdue for past dates', () => {
    const { computeFollowUpStatus } = require('@/lib/admin/followup-service');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(computeFollowUpStatus(yesterday)).toBe('overdue');
  });

  it('computeFollowUpStatus returns due_today for today', () => {
    const { computeFollowUpStatus } = require('@/lib/admin/followup-service');
    const today = new Date();
    expect(computeFollowUpStatus(today)).toBe('due_today');
  });

  it('computeFollowUpStatus returns upcoming for future dates', () => {
    const { computeFollowUpStatus } = require('@/lib/admin/followup-service');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    expect(computeFollowUpStatus(tomorrow)).toBe('upcoming');
  });
});
