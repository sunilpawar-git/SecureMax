/**
 * Phase 5 — Auth & onboarding restyle (SSOT + restyle-only contracts).
 *
 * Auth signin/error pages are async Server Components that import NextAuth +
 * generated Prisma client (ESM `import.meta`), so they cannot be `require()`d
 * in Jest — we assert their source against the SSOT contract via regex, the
 * same approach as auth-pages.test.ts. The combined onboarding client gets a
 * real RTL+axe render in onboarding/__tests__/onboarding-client.test.tsx.
 *
 * Assertion #7 (locked plan): the consent block is RESTYLE ONLY. Its DPDPA
 * consent wording, checkbox, and flow stay byte-for-byte; we guard that here so
 * a future "move strings to config" refactor can't silently alter legal copy.
 * Phase 4 merged consent + profile into one screen — the legal copy now lives
 * in ConsentLegalBlock.tsx (relocated verbatim) and the profile fields in
 * onboarding-client.tsx.
 */

import fs from 'fs';
import path from 'path';
import { AUTH, AUTH_ERROR_MESSAGES, ONBOARDING } from '@/config/strings';

const read = (...segments: string[]) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), 'utf-8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const SIGNIN = ['src', 'app', 'auth', 'signin', 'page.tsx'];
const ERROR = ['src', 'app', 'auth', 'error', 'page.tsx'];
const PROFILE = ['src', 'app', '(app)', 'onboarding', 'onboarding-client.tsx'];
const CONSENT = ['src', 'app', '(app)', 'onboarding', 'ConsentLegalBlock.tsx'];

describe('Phase 5 SSOT string groups', () => {
  it('AUTH values are non-empty strings', () => {
    Object.values(AUTH).forEach((v) => {
      expect(typeof v).toBe('string');
      expect(v.trim().length).toBeGreaterThan(0);
    });
  });

  it('AUTH_ERROR_MESSAGES covers Default + the NextAuth OAuth codes', () => {
    expect(AUTH_ERROR_MESSAGES.Default.trim().length).toBeGreaterThan(0);
    ['Configuration', 'AccessDenied', 'OAuthSignin', 'OAuthAccountNotLinked'].forEach((code) => {
      expect(AUTH_ERROR_MESSAGES[code].trim().length).toBeGreaterThan(0);
    });
  });

  it('ONBOARDING values are non-empty strings', () => {
    Object.values(ONBOARDING).forEach((v) => {
      expect(typeof v).toBe('string');
      expect(v.trim().length).toBeGreaterThan(0);
    });
  });
});

describe('Sign-in page adopts primitives + SSOT (no hardcoded copy)', () => {
  const src = stripComments(read(...SIGNIN));

  it('imports the Button and Card primitives', () => {
    expect(src).toContain("from '@/components/ui/Button'");
    expect(src).toContain("from '@/components/ui/Card'");
  });

  it('sources OAuth labels from AUTH, not inline strings', () => {
    expect(src).toContain('AUTH.CONTINUE_GOOGLE');
    expect(src).toContain('AUTH.CONTINUE_MICROSOFT');
    expect(src).toContain('AUTH.SIGN_IN_TITLE_PREFIX');
    expect(src).not.toMatch(/'Continue with Google'|"Continue with Google"/);
    expect(src).not.toContain('Sign in to {APP.NAME}');
  });

  it('keeps NextAuth provider wiring untouched (Rule 14)', () => {
    expect(src).toContain("signIn('google'");
    expect(src).toContain("signIn('microsoft-entra-id'");
  });
});

describe('Auth error page adopts SSOT (no inline message map / copy)', () => {
  const src = stripComments(read(...ERROR));

  it('sources the message map + titles from config, not a local const', () => {
    expect(src).toContain('AUTH_ERROR_MESSAGES');
    expect(src).toContain('AUTH.ERROR_TITLE');
    expect(src).toContain('AUTH.ERROR_TRY_AGAIN');
    expect(src).not.toContain('const ERROR_MESSAGES');
    expect(src).not.toContain('Authentication Error<');
  });

  it('the retry link reuses BUTTON_STYLES tokens (DRY, no raw button blob)', () => {
    expect(src).toContain('BUTTON_STYLES');
    expect(src).not.toContain('bg-emerald-700 px-4 py-2.5');
  });
});

describe('Onboarding phone field adopts primitives + SSOT', () => {
  const src = stripComments(read(...PROFILE));

  it('imports Card', () => {
    expect(src).toContain("from '@/components/ui/Card'");
  });

  it('sources phone copy from ONBOARDING, not inline', () => {
    expect(src).toContain('ONBOARDING.PHONE_LABEL');
    expect(src).toContain('ONBOARDING.PHONE_HINT');
  });

  it('no longer collects city/country (moved into the question graph)', () => {
    expect(src).not.toContain('ONBOARDING_COUNTRIES');
    expect(src).not.toContain("id=\"city\"");
    expect(src).not.toContain("id=\"country\"");
  });
});

describe('Consent legal block — restyle only (assertion #7: copy byte-for-byte)', () => {
  const raw = read(...CONSENT);
  const src = stripComments(raw);

  it('adopts the Button + Card primitives', () => {
    expect(src).toContain("from '@/components/ui/Button'");
    expect(src).toContain("from '@/components/ui/Card'");
  });

  it('preserves the DPDPA attestation and rights copy verbatim', () => {
    expect(raw).toContain('Digital Personal Data Protection Act, 2023');
    expect(raw).toContain('Your answers are encrypted at rest using AES-256-GCM');
    expect(raw).toContain('Right to erasure (soft-delete with anonymization)');
    expect(raw).toContain('I Agree — Continue to Assessment');
  });

  it('keeps the consent flow + legal links wired unchanged', () => {
    expect(src).toContain("from '@/config/legal-strings'");
    expect(src).toContain("fetch('/api/consent'");
    expect(src).toContain('LEGAL_LINKS.PRIVACY');
  });
});
