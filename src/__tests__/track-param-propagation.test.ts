/**
 * Phase 1 — track re-selection redundancy fix.
 *
 * The `track` query param chosen on the landing page was dropped at three
 * redirect points, forcing a second HNI/Enterprise pick right before Q1.
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
const CONSENT = ['src', 'app', '(app)', 'onboarding', 'consent', 'page.tsx'];
const PROFILE = ['src', 'app', '(app)', 'onboarding', 'profile', 'page.tsx'];

describe('proxy.ts preserves track on the consent redirect', () => {
  const src = stripComments(read(...PROXY));

  it('forwards the query string when redirecting to /onboarding/consent', () => {
    expect(src).toContain("new URL('/onboarding/consent', nextUrl)");
    expect(src).toContain('consentUrl.search = nextUrl.search');
  });
});

describe('questionnaire/page.tsx forwards track on both onboarding redirects', () => {
  const src = stripComments(read(...QUESTIONNAIRE_PAGE));

  it('reads track from searchParams', () => {
    expect(src).toContain('searchParams: Promise<{ track?: string }>');
    expect(src).toContain('const { track } = await searchParams');
  });

  it('appends track to the consent redirect', () => {
    expect(src).toContain('redirect(`/onboarding/consent${trackQuery}`)');
  });

  it('appends track to the profile redirect', () => {
    expect(src).toContain('redirect(`/onboarding/profile${trackQuery}`)');
  });
});

describe('consent/page.tsx forwards track to the profile redirect', () => {
  const src = stripComments(read(...CONSENT));

  it('reads track via useSearchParams', () => {
    expect(src).toContain("searchParams.get('track')");
  });

  it('appends track when pushing to /onboarding/profile', () => {
    expect(src).toContain('/onboarding/profile?track=');
  });
});

describe('profile/page.tsx forwards track to the questionnaire redirect', () => {
  const src = stripComments(read(...PROFILE));

  it('reads track via useSearchParams', () => {
    expect(src).toContain("searchParams.get('track')");
  });

  it('appends track when pushing to /questionnaire', () => {
    expect(src).toContain('/questionnaire?track=');
  });
});
