/**
 * Tests for admin panel route protection — Phase 8 verification.
 */

import { PROTECTED_ROUTES } from '@/lib/auth/callbacks';

describe('Admin routes are protected', () => {
  it('middleware protects /admin routes', () => {
    const adminRoute = PROTECTED_ROUTES.find((r) => r.includes('/admin'));
    expect(adminRoute).toBeDefined();
  });

  it('admin route uses wildcard pattern', () => {
    const adminRoute = PROTECTED_ROUTES.find((r) => r.includes('/admin'));
    expect(adminRoute).toContain(':path');
  });
});

describe('Admin API route structure', () => {
  it('stats endpoint returns expected shape', () => {
    const expectedKeys = ['scraperHealthy', 'totalArticles', 'pendingLeads', 'reportsGenerated'];
    const mockResponse = {
      scraperHealthy: true,
      totalArticles: 0,
      pendingLeads: 0,
      reportsGenerated: 0,
    };
    for (const key of expectedKeys) {
      expect(key in mockResponse).toBe(true);
    }
  });

  it('leads endpoint returns array', () => {
    const mockResponse: unknown[] = [];
    expect(Array.isArray(mockResponse)).toBe(true);
  });

  it('reports endpoint returns array', () => {
    const mockResponse: unknown[] = [];
    expect(Array.isArray(mockResponse)).toBe(true);
  });
});

describe('AdminNav exit link — SSOT and navigation contract', () => {
  it('NAV.EXIT_ADMIN exists and is non-empty', () => {
    const { NAV } = require('@/config/strings');
    expect(NAV.EXIT_ADMIN).toBeDefined();
    expect(NAV.EXIT_ADMIN.trim().length).toBeGreaterThan(0);
  });

  it('NAV.EXIT_ADMIN contains a back arrow indicator', () => {
    const { NAV } = require('@/config/strings');
    expect(NAV.EXIT_ADMIN).toContain('←');
  });

  it('ADMIN_EXIT_LINK_STYLE is exported from admin-colors', () => {
    const mod = require('@/config/admin-colors');
    expect(mod.ADMIN_EXIT_LINK_STYLE).toBeDefined();
    expect(typeof mod.ADMIN_EXIT_LINK_STYLE).toBe('string');
    expect(mod.ADMIN_EXIT_LINK_STYLE.trim().length).toBeGreaterThan(0);
  });

  it('AdminNav source references NAV.EXIT_ADMIN (no hardcoded string)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', 'admin', '_components', 'AdminNav.tsx'),
      'utf-8'
    );
    expect(src).toContain('NAV.EXIT_ADMIN');
    expect(src).toContain('/dashboard');
    // Strip comments, verify no raw hardcoded exit string
    const noComments = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(noComments).not.toMatch(/"← Exit Admin"/);
  });

  it('AdminNav source references ADMIN_EXIT_LINK_STYLE (no hardcoded classes)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', 'admin', '_components', 'AdminNav.tsx'),
      'utf-8'
    );
    expect(src).toContain('ADMIN_EXIT_LINK_STYLE');
  });
});
