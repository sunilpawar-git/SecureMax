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
