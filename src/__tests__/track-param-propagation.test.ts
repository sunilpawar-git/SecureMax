/**
 * Phase 1 — track re-selection redundancy fix.
 * Phase 4 — consent + profile merged into a single /onboarding screen, so the
 * redirect target collapsed from two hops to one; the old consent/profile
 * pages are now redirect shims that forward to /onboarding.
 *
 * These are source-regex assertions (same approach as
 * auth-onboarding-restyle.test.ts) since proxy.ts and the onboarding pages
 * are not easily unit-rendered in isolation.
 */

import fs from 'fs';
import path from 'path';

const read = (...segments: string[]) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), 'utf-8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const PROXY = ['src', 'proxy.ts'];
const QUESTIONNAIRE_PAGE = ['src', 'app', '(app)', 'questionnaire', 'page.tsx'];
const CONSENT_SHIM = ['src', 'app', '(app)', 'onboarding', 'consent', 'page.tsx'];
const PROFILE_SHIM = ['src', 'app', '(app)', 'onboarding', 'profile', 'page.tsx'];

describe('proxy.ts preserves track on the onboarding redirect', () => {
  const src = stripComments(read(...PROXY));

  it('forwards the query string when redirecting to /onboarding', () => {
    expect(src).toContain("new URL('/onboarding', nextUrl)");
    expect(src).toContain('consentUrl.search = nextUrl.search');
  });
});

describe('questionnaire/page.tsx forwards track to the single onboarding redirect', () => {
  const src = stripComments(read(...QUESTIONNAIRE_PAGE));

  it('reads track from searchParams', () => {
    expect(src).toContain('searchParams: Promise<{ track?: string }>');
    expect(src).toContain('const { track } = await searchParams');
  });

  it('redirects to /onboarding with track preserved', () => {
    expect(src).toContain('redirect(`/onboarding${trackQuery}`)');
  });
});

describe('deprecated consent/profile shims forward track to /onboarding', () => {
  it('consent shim redirects preserving track', () => {
    const src = stripComments(read(...CONSENT_SHIM));
    expect(src).toContain("searchParams.get('track')");
    expect(src).toContain('/onboarding?track=');
  });

  it('profile shim redirects preserving track', () => {
    const src = stripComments(read(...PROFILE_SHIM));
    expect(src).toContain("searchParams.get('track')");
    expect(src).toContain('/onboarding?track=');
  });
});
