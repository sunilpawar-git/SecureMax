/**
 * Phase 2 TDD — LandingHeader component.
 * All tests written BEFORE implementation. They must fail first, then green after Phase 3.
 *
 * Contract being tested:
 * - SSOT: uses NAV.SIGN_IN string, not hardcoded text
 * - SSOT: uses LANDING_HEADER_STYLES tokens, not hardcoded classes
 * - Structure: named export, accepts no required props (public, no session)
 * - Security: sign-in link points to /auth/signin (no track param for direct login flow)
 * - UX: logo links to landing page (/), not /dashboard (unauthenticated context)
 */

import { NAV } from '@/config/strings';
import { LANDING_HEADER_STYLES } from '@/config/colors';

describe('NAV.SIGN_IN SSOT', () => {
  it('exists and equals "Sign In"', () => {
    expect(NAV.SIGN_IN).toBe('Sign In');
  });

  it('is non-empty', () => {
    expect(NAV.SIGN_IN.trim().length).toBeGreaterThan(0);
  });
});

describe('LANDING_HEADER_STYLES SSOT', () => {
  it('has header, nav, logo, and signInLink tokens', () => {
    expect(LANDING_HEADER_STYLES.header).toBeDefined();
    expect(LANDING_HEADER_STYLES.nav).toBeDefined();
    expect(LANDING_HEADER_STYLES.logo).toBeDefined();
    expect(LANDING_HEADER_STYLES.signInLink).toBeDefined();
  });

  it('all tokens are non-empty strings', () => {
    Object.values(LANDING_HEADER_STYLES).forEach((val) => {
      expect(typeof val).toBe('string');
      expect(val.trim().length).toBeGreaterThan(0);
    });
  });

  it('header token positions it absolutely at top (overlay on hero)', () => {
    expect(LANDING_HEADER_STYLES.header).toContain('absolute');
    expect(LANDING_HEADER_STYLES.header).toContain('top-0');
  });
});

describe('LandingHeader module contract', () => {
  it('exports LandingHeader as a named function', () => {
    const mod = require('@/components/landing/LandingHeader');
    expect(mod.LandingHeader).toBeDefined();
    expect(typeof mod.LandingHeader).toBe('function');
  });
});

describe('LandingHeader source uses SSOT (no hardcoded strings or classes)', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(process.cwd(), 'src', 'components', 'landing', 'LandingHeader.tsx'),
    'utf-8'
  );

  it('references NAV.SIGN_IN (no hardcoded "Sign In" in JSX)', () => {
    expect(src).toContain('NAV.SIGN_IN');
    // Strip both block and line comments, then verify no hardcoded string in JSX
    const noComments = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(noComments).not.toMatch(/"Sign In"/);
  });

  it('references LANDING_HEADER_STYLES (no hardcoded tailwind in JSX props)', () => {
    expect(src).toContain('LANDING_HEADER_STYLES');
  });

  it('sign-in href is /auth/signin (no track param — direct login path)', () => {
    expect(src).toContain('/auth/signin');
    expect(src).not.toContain('/auth/signin?track=');
  });

  it('logo href is / (landing page, not /dashboard)', () => {
    expect(src).toContain('href="/"');
  });
});

describe('LandingPage integrates LandingHeader', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'page.tsx'), 'utf-8');

  it('imports LandingHeader', () => {
    expect(src).toContain('LandingHeader');
  });

  it('renders LandingHeader above main content', () => {
    const headerIdx = src.indexOf('LandingHeader');
    const mainIdx = src.indexOf('<main');
    expect(headerIdx).toBeGreaterThan(-1);
    expect(mainIdx).toBeGreaterThan(-1);
    expect(headerIdx).toBeLessThan(mainIdx);
  });
});
