/**
 * Phase 5 — Admin analytics page.
 * Verifies page export and nav configuration.
 */

import fs from 'fs';
import path from 'path';
import * as AnalyticsPageModule from '@/app/admin/analytics/page';

describe('Admin analytics page', () => {
  it('analytics/page.tsx exports a default function', () => {
    expect(typeof AnalyticsPageModule.default).toBe('function');
  });

  it('admin nav includes analytics link', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src', 'config', 'admin-strings.ts'),
      'utf-8',
    );
    expect(content).toContain('/admin/analytics');
    expect(content).toContain('Analytics');
  });
});
