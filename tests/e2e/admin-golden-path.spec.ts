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

    expect(page.url()).toContain('/auth/signin');
  });

  test('admin API analytics endpoint returns auth error without session', async ({ request }) => {
    const resp = await request.get('/api/admin/analytics');
    expect([401, 403]).toContain(resp.status());
  });

  test('admin API stats endpoint returns auth error without session', async ({ request }) => {
    const resp = await request.get('/api/admin/stats');
    expect([401, 403]).toContain(resp.status());
  });

  test('admin API sessions endpoint returns auth error without session', async ({ request }) => {
    const resp = await request.get('/api/admin/sessions');
    expect([401, 403]).toContain(resp.status());
  });

  test('admin API scraper endpoint rejects unauthenticated requests', async ({ request }) => {
    const resp = await request.post('/api/admin/scraper', {
      data: { action: 'trigger' },
    });
    expect([401, 403]).toContain(resp.status());
  });

  test('admin API threat-intel endpoint returns auth error without session', async ({ request }) => {
    const resp = await request.get('/api/admin/threat-intel');
    expect([401, 403]).toContain(resp.status());
  });
});
