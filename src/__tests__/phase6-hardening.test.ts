/**
 * Phase 6 — Hardening: DPDPA erasure, security pass, PWA offline.
 * TDD: Tests written BEFORE implementation.
 */

import fs from 'fs';
import path from 'path';

describe('DPDPA erasure API', () => {
  it('api/user/erasure/route.ts exists', () => {
    const p = path.join(process.cwd(), 'src', 'app', 'api', 'user', 'erasure', 'route.ts');
    expect(fs.existsSync(p)).toBe(true);
  });

  it('erasure route uses shared guards', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', 'api', 'user', 'erasure', 'route.ts'),
      'utf-8',
    );
    expect(content).toContain("from '@/lib/api'");
  });
});

describe('PWA service worker', () => {
  it('public/sw.js exists', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'public', 'sw.js'))).toBe(true);
  });

  it('manifest.json exists with required fields', () => {
    const content = fs.readFileSync(path.join(process.cwd(), 'public', 'manifest.json'), 'utf-8');
    const manifest = JSON.parse(content);
    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe('standalone');
  });
});

describe('Security headers are set via next.config.ts (SSOT)', () => {
  it('next.config.ts imports SECURITY_HEADERS and sets headers()', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'next.config.ts'),
      'utf-8',
    );
    expect(content).toContain('SECURITY_HEADERS');
    expect(content).toContain('headers()');
  });

  it('middleware.ts does NOT duplicate header setting', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src', 'middleware.ts'),
      'utf-8',
    );
    expect(content).not.toContain('Object.entries(SECURITY_HEADERS)');
  });

  it('security.ts defines X-Content-Type-Options header', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src', 'config', 'security.ts'),
      'utf-8',
    );
    expect(content).toContain('X-Content-Type-Options');
  });
});
