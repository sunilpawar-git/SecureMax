/**
 * Phase 5 — Admin analytics page.
 * Verifies page export and nav configuration.
 */

import fs from 'fs';
import path from 'path';

describe('Admin analytics page', () => {
  it('analytics/page.tsx exports a default function', () => {
    const mod = require('@/app/admin/analytics/page');
    expect(typeof mod.default).toBe('function');
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
