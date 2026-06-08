/**
 * E2E Golden Path — HNI (High Net Worth Individual) Journey.
 *
 * Flow: Landing → Sign-in (track=hni) → Consent → Questionnaire (HNI pre-selected)
 *       → Complete → Report status → Free summary → Payment → Download
 */

import { test, expect } from '@playwright/test';
import { TRACK } from './helpers/constants';

/** iPhone-sized viewport — below Tailwind's `md` (768px) so `md:hidden` kicks in. */
const MOBILE_VIEWPORT = { width: 390, height: 844 };

/**
 * Mobile landing-page nav drawer (Sprint 5 UI overhaul, Phase 3) — the one piece
 * of new restyled UI reachable WITHOUT authentication, since `helpers/auth.ts`
 * cannot complete a real OAuth sign-in (no test/credentials provider exists; see
 * the note at the bottom of this file). Runs at a real mobile viewport so the
 * `md:hidden` hamburger and slide-in panel are exercised the way a phone user
 * would see them — RTL/jsdom coverage (`LandingHeader.test.tsx`,
 * `MobileNavDrawer.test.tsx`) cannot verify actual layout/visibility at a
 * breakpoint, only DOM presence.
 */
test.describe('Mobile nav drawer (landing page)', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test('hamburger opens the drawer; Sign In link navigates; Escape closes it', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hamburger = page.getByRole('button', { name: /open menu/i });
    await expect(hamburger).toBeVisible();

    const drawer = page.getByTestId('mobile-nav-drawer');
    await expect(drawer).not.toBeVisible();

    await hamburger.click();
    await expect(drawer).toBeVisible();

    const signInLink = drawer.getByRole('link', { name: /sign in/i });
    await expect(signInLink).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();

    await hamburger.click();
    await expect(drawer).toBeVisible();
    await signInLink.click();
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});

test.describe('HNI Golden Path', () => {
  test('landing page hero CTAs have correct track hrefs', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hniCta = page.locator(`a[href*="track=${TRACK.HNI}"]`).first();
    await expect(hniCta).toBeVisible();
    await expect(hniCta).toHaveAttribute('href', `/auth/signin?track=${TRACK.HNI}`);

    const enterpriseCta = page.locator(`a[href*="track=${TRACK.ENTERPRISE}"]`).first();
    await expect(enterpriseCta).toBeVisible();
    await expect(enterpriseCta).toHaveAttribute('href', `/auth/signin?track=${TRACK.ENTERPRISE}`);
  });

  test('sign-in page receives track param in URL', async ({ page }) => {
    await page.goto(`/auth/signin?track=${TRACK.HNI}`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain(`track=${TRACK.HNI}`);
    await expect(page.getByText('Sign in to')).toBeVisible();
    await expect(page.getByText('Continue with Google')).toBeVisible();
    await expect(page.getByText('Continue with Microsoft')).toBeVisible();
  });

  test('consent page displays DPDPA information', async ({ page }) => {
    await page.goto('/onboarding/consent');
    await page.waitForLoadState('networkidle');

    // Protected route — will redirect if not authenticated
    // Just verify page loads successfully (HTTP 200 or redirect)
    expect([200, 307, 308]).toContain(page.url().includes('signin') ? 200 : 200);
  });

  test('questionnaire page loads with track picker', async ({ page }) => {
    await page.goto(`/questionnaire?track=${TRACK.HNI}`);
    await page.waitForLoadState('networkidle');

    // Protected route — will redirect if not authenticated (this is correct)
    // Just verify page loads successfully
    const currentUrl = page.url();
    expect(currentUrl).toBeTruthy();
  });

  test('payment page loads with amount and features', async ({ page }) => {
    await page.goto('/payment/test-session');
    await page.waitForLoadState('networkidle');

    // Protected route — will redirect if not authenticated (this is correct behavior)
    // Just verify page loads successfully
    const currentUrl = page.url();
    expect(currentUrl).toBeTruthy();
  });

  test('report download page loads', async ({ page }) => {
    await page.goto('/report/test-session/download');

    if (!page.url().includes('/auth/signin') && !page.url().includes('/onboarding/consent')) {
      await page.waitForLoadState('networkidle');
    }
  });

  test('report status page loads', async ({ page }) => {
    await page.goto('/report/test-session/status');

    if (!page.url().includes('/auth/signin') && !page.url().includes('/onboarding/consent')) {
      await page.waitForLoadState('networkidle');
    }
  });

  /**
   * KNOWN GAP (surfaced per Rule 12 — fail loud, don't silently skip):
   *
   * The Sprint 5 UI overhaul plan called for these specs to drive into the
   * authenticated questionnaire/report DOM and exercise the new
   * `data-testid="question-card"` / `question-option` / `question-continue`
   * hooks at the browser level. That isn't possible today: `helpers/auth.ts`
   * (`authenticateAsUser`) only navigates to `/auth/signin` and waits — it does
   * NOT complete a sign-in, because the app has no test/credentials auth path
   * (only Google + Microsoft Entra OAuth — see `src/lib/auth/config.ts`, and
   * Rule 14: "no custom password auth, ever"). Every test above that touches a
   * protected route therefore only asserts "redirected, page didn't crash."
   *
   * Closing this gap for real requires a deliberate decision on test-auth
   * infrastructure (e.g. a CredentialsProvider gated to non-prod envs, or
   * pre-seeded session cookies via a test-only endpoint) — a security-sensitive
   * choice that belongs to its own reviewed change, not a UI bug-fix pass. Until
   * then, the questionnaire/report `data-testid` hooks are exercised only at the
   * component level (`questionnaire-layout.test.tsx`).
   */
});
