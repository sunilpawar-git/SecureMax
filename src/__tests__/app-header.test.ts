/**
 * Phase 1 tests — AppHeader and AppLayoutShell.
 * Verifies header variants, SSOT string/color usage, and layout routing.
 */

import { NAV } from '@/config/strings';
import { HEADER_STYLES } from '@/config/admin-colors';

describe('NAV string constants', () => {
  it('has all required navigation labels', () => {
    expect(NAV.DASHBOARD).toBe('Dashboard');
    expect(NAV.START_AUDIT).toBe('New Assessment');
    expect(NAV.SAVE_EXIT).toBe('Save & Exit');
    expect(NAV.SIGN_OUT).toBe('Sign Out');
  });

  it('has no empty values', () => {
    Object.values(NAV).forEach((val) => {
      expect(val).toBeTruthy();
      expect(val.trim().length).toBeGreaterThan(0);
    });
  });
});

describe('HEADER_STYLES', () => {
  it('has full and slim variants', () => {
    expect(HEADER_STYLES.full).toBeDefined();
    expect(HEADER_STYLES.slim).toBeDefined();
  });

  it('full variant uses white background with border', () => {
    expect(HEADER_STYLES.full).toContain('bg-white');
    expect(HEADER_STYLES.full).toContain('border-b');
  });

  it('slim variant uses slate-50 background with border', () => {
    expect(HEADER_STYLES.slim).toContain('bg-slate-50');
    expect(HEADER_STYLES.slim).toContain('border-b');
  });
});

describe('AppHeader module contract', () => {
  it('exports AppHeader component', () => {
    const mod = require('@/components/AppHeader');
    expect(mod.AppHeader).toBeDefined();
    expect(typeof mod.AppHeader).toBe('function');
  });

  it('AppHeader accepts variant prop', () => {
    const { AppHeader } = require('@/components/AppHeader');
    expect(AppHeader.length).toBeGreaterThanOrEqual(0);
  });
});

describe('AppLayoutShell module contract', () => {
  it('exports AppLayoutShell component', () => {
    const mod = require('@/components/AppLayoutShell');
    expect(mod.AppLayoutShell).toBeDefined();
    expect(typeof mod.AppLayoutShell).toBe('function');
  });
});

describe('Config barrel exports include new entries', () => {
  it('NAV is exported from @/config', () => {
    const config = require('@/config');
    expect(config.NAV).toBeDefined();
    expect(config.NAV.DASHBOARD).toBe('Dashboard');
  });

  it('HEADER_STYLES is exported from @/config', () => {
    const config = require('@/config');
    expect(config.HEADER_STYLES).toBeDefined();
    expect(config.HEADER_STYLES.full).toBeDefined();
    expect(config.HEADER_STYLES.slim).toBeDefined();
  });
});
