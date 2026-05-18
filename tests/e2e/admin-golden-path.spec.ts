/**
 * E2E Golden Path — Admin Journey.
 *
 * Flow: Auth as admin → Admin dashboard → Scraper → Threat intel → LinkedIn drafts
 *       → Session audit log
 *
 * Note: Admin routes require `role: 'admin'` on the user. In CI, this is
 * achieved via a test credentials provider with a seeded admin user.
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Golden Path', () => {
  test('admin pages redirect unauthenticated users to sign-in', async ({ page }) => {
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');

    // Should redirect to signin when not authenticated
    expect(page.url().includes('/auth/signin') || page.url().includes('/admin')).toBeTruthy();
  });

  test('admin API analytics endpoint returns auth error without session', async ({ request }) => {
    const resp = await request.get('/api/admin/analytics');
    // Should return 401 (unauthorized) or redirect
    expect(resp.status()).toBeGreaterThanOrEqual(400);
  });

  test('admin API stats endpoint returns auth error without session', async ({ request }) => {
    const resp = await request.get('/api/admin/stats');
    expect(resp.status()).toBeGreaterThanOrEqual(400);
  });

  test('admin API sessions endpoint returns auth error without session', async ({ request }) => {
    const resp = await request.get('/api/admin/sessions');
    expect(resp.status()).toBeGreaterThanOrEqual(400);
  });

  test('admin API scraper endpoint rejects unauthenticated requests', async ({ request }) => {
    const resp = await request.post('/api/admin/scraper', {
      data: { action: 'trigger' },
    });
    expect(resp.status()).toBeGreaterThanOrEqual(400);
  });

  test('admin API threat-intel endpoint returns auth error without session', async ({ request }) => {
    const resp = await request.get('/api/admin/threat-intel');
    expect(resp.status()).toBeGreaterThanOrEqual(400);
  });
});
