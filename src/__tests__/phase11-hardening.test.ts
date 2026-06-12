/**
 * Phase 11C — security hardening wiring guards.
 * proxy.ts is wrapped in NextAuth's ESM `auth()` middleware, so (matching the
 * precedent in phase-a-security.test.ts) wiring is asserted via source checks.
 */

import fs from 'fs';
import path from 'path';
import { RATE_LIMITS } from '@/config/security';

const middlewareSource = fs.readFileSync(path.join(process.cwd(), 'src', 'proxy.ts'), 'utf-8');
const layoutSource = fs.readFileSync(
  path.join(process.cwd(), 'src', 'app', 'admin', 'layout.tsx'),
  'utf-8',
);

describe('Auth rate limits are wired into the middleware (no dead config)', () => {
  it('proxy.ts applies AUTH_WINDOW_MS and AUTH_MAX_REQUESTS', () => {
    expect(middlewareSource).toContain('RATE_LIMITS.AUTH_WINDOW_MS');
    expect(middlewareSource).toContain('RATE_LIMITS.AUTH_MAX_REQUESTS');
  });

  it('targets the brute-force surface (signin/callback) but not session polling', () => {
    expect(middlewareSource).toContain('/api/auth/signin');
    expect(middlewareSource).toContain('/api/auth/callback');
    // /api/auth/session must NOT be routed to the tight auth limiter.
    expect(middlewareSource).not.toMatch(/startsWith\(['"]\/api\/auth\/session/);
  });

  it('auth limits are tighter than the global limits', () => {
    const authRps = RATE_LIMITS.AUTH_MAX_REQUESTS / RATE_LIMITS.AUTH_WINDOW_MS;
    const globalRps = RATE_LIMITS.GLOBAL_MAX_REQUESTS / RATE_LIMITS.GLOBAL_WINDOW_MS;
    expect(authRps).toBeLessThan(globalRps);
  });
});

describe('Admin idle logout is mounted in the admin layout', () => {
  it('admin layout renders IdleLogout', () => {
    expect(layoutSource).toContain('IdleLogout');
  });
});
