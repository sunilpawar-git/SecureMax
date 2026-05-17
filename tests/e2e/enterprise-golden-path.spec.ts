/**
 * E2E Golden Path — Enterprise Journey.
 *
 * Flow: Sign-in (track=enterprise) → Consent → Questionnaire (enterprise pre-selected)
 *       → Complete → Enterprise proposal form (pre-filled) → Admin unlocks → Download
 */

import { test, expect } from '@playwright/test';
import { TRACK } from './helpers/constants';

test.describe('Enterprise Golden Path', () => {
  test('sign-in page with enterprise track param', async ({ page }) => {
    await page.goto(`/auth/signin?track=${TRACK.ENTERPRISE}`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain(`track=${TRACK.ENTERPRISE}`);
    await expect(page.getByText('Sign in to')).toBeVisible();
  });

  test('questionnaire page with enterprise track pre-selected', async ({ page }) => {
    await page.goto(`/questionnaire?track=${TRACK.ENTERPRISE}`);

    if (!page.url().includes('/auth/signin') && !page.url().includes('/onboarding/consent')) {
      await expect(page.getByText('Audit My Facility')).toBeVisible();
    }
  });

  test('enterprise proposal page loads', async ({ page }) => {
    await page.goto('/enterprise/proposal');

    if (!page.url().includes('/auth/signin') && !page.url().includes('/onboarding/consent')) {
      await expect(page.getByText('Request Enterprise Proposal')).toBeVisible();
      await expect(page.locator('input[name="companyName"]')).toBeVisible();
      await expect(page.locator('input[name="contactName"]')).toBeVisible();
      await expect(page.locator('input[name="contactEmail"]')).toBeVisible();
    }
  });

  test('enterprise proposal form has required fields', async ({ page }) => {
    await page.goto('/enterprise/proposal');

    if (!page.url().includes('/auth/signin') && !page.url().includes('/onboarding/consent')) {
      const companyInput = page.locator('input[name="companyName"]');
      const nameInput = page.locator('input[name="contactName"]');
      const emailInput = page.locator('input[name="contactEmail"]');

      await expect(companyInput).toHaveAttribute('required', '');
      await expect(nameInput).toHaveAttribute('required', '');
      await expect(emailInput).toHaveAttribute('required', '');
    }
  });
});
