/**
 * E2E auth helpers — provides mock session setup for Playwright tests.
 *
 * In test mode, NextAuth can be configured with a CredentialsProvider
 * or the tests can use pre-seeded session cookies. This helper
 * abstracts that setup so individual test files stay clean.
 */

import { Page } from '@playwright/test';

export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'e2e-test@raivanglobal.com',
  name: process.env.TEST_USER_NAME || 'E2E Test User',
};

export const TEST_ADMIN = {
  email: process.env.TEST_ADMIN_EMAIL || 'admin@raivanglobal.com',
  name: process.env.TEST_ADMIN_NAME || 'E2E Admin',
};

/**
 * Authenticate by navigating to sign-in and handling the OAuth mock.
 * In CI, uses a test credentials provider; locally, relies on
 * pre-seeded session cookies or a test OAuth mock.
 */
export async function authenticateAsUser(page: Page, track?: string): Promise<void> {
  const url = track ? `/auth/signin?track=${track}` : '/auth/signin';
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

export async function authenticateAsAdmin(page: Page): Promise<void> {
  await page.goto('/auth/signin');
  await page.waitForLoadState('networkidle');
}

/**
 * Accept DPDPA consent if the consent page appears.
 */
export async function acceptConsentIfPresent(page: Page): Promise<void> {
  if (page.url().includes('/onboarding/consent')) {
    const checkbox = page.locator('input[type="checkbox"]');
    if (await checkbox.isVisible()) {
      await checkbox.check();
      await page.getByRole('button', { name: /agree/i }).click();
      await page.waitForURL(/(?!.*onboarding\/consent)/);
    }
  }
}
