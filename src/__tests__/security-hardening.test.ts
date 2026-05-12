/**
 * Security hardening tests — Phase 9 verification.
 * Verifies OWASP headers, DPDPA compliance structure, PWA manifest.
 */

import { SECURITY_HEADERS, RATE_LIMITS, ENCRYPTION } from '@/config/security';
import fs from 'fs';
import path from 'path';

describe('OWASP Security Headers', () => {
  it('defines all critical security headers', () => {
    const requiredHeaders = [
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Strict-Transport-Security',
    ];
    const headerKeys = Object.keys(SECURITY_HEADERS);
    for (const required of requiredHeaders) {
      expect(headerKeys).toContain(required);
    }
  });

  it('X-Frame-Options is DENY', () => {
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
  });

  it('HSTS max-age is at least 1 year', () => {
    const hsts = SECURITY_HEADERS['Strict-Transport-Security'];
    expect(hsts).toContain('max-age=');
    const match = hsts.match(/max-age=(\d+)/);
    expect(Number(match?.[1])).toBeGreaterThanOrEqual(31536000);
  });

  it('nosniff is set', () => {
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
  });

  it('CSP is defined and restrictive', () => {
    const csp = SECURITY_HEADERS['Content-Security-Policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
  });
});

describe('Rate limiting configuration', () => {
  it('defines AI endpoint rate limit', () => {
    expect(RATE_LIMITS.AI_ENDPOINT_MAX_REQUESTS).toBeGreaterThan(0);
  });

  it('defines global rate limit', () => {
    expect(RATE_LIMITS.GLOBAL_MAX_REQUESTS).toBeGreaterThan(0);
  });

  it('global limit is higher than AI endpoint', () => {
    expect(RATE_LIMITS.GLOBAL_MAX_REQUESTS).toBeGreaterThan(
      RATE_LIMITS.AI_ENDPOINT_MAX_REQUESTS,
    );
  });

  it('rate limiter blocks after max requests', () => {
    const { checkRateLimit } = require('@/lib/rate-limit');
    const id = `test-${Date.now()}`;
    const maxReqs = 3;
    const windowMs = 5000;

    for (let i = 0; i < maxReqs; i++) {
      const r = checkRateLimit(id, windowMs, maxReqs);
      expect(r.allowed).toBe(true);
    }

    const blocked = checkRateLimit(id, windowMs, maxReqs);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});

describe('Encryption configuration', () => {
  it('uses AES-256-GCM', () => {
    expect(ENCRYPTION.ALGORITHM).toBe('aes-256-gcm');
  });

  it('IV length is 16 bytes', () => {
    expect(ENCRYPTION.IV_LENGTH).toBe(16);
  });

  it('tag length is 16 bytes', () => {
    expect(ENCRYPTION.TAG_LENGTH).toBe(16);
  });

  it('key length is 32 bytes (256 bits)', () => {
    expect(ENCRYPTION.KEY_LENGTH).toBe(32);
  });
});

describe('PWA Manifest', () => {
  it('manifest.json exists in public directory', () => {
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
  });

  it('manifest has required fields', () => {
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toHaveLength(3);
  });

  it('service worker exists', () => {
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    expect(fs.existsSync(swPath)).toBe(true);
  });
});

describe('DPDPA Compliance Structure', () => {
  it('consent API route file exists', () => {
    const consentPath = path.join(
      process.cwd(), 'src', 'app', 'api', 'consent', 'route.ts',
    );
    expect(fs.existsSync(consentPath)).toBe(true);
  });

  it('encryption utility handles sensitive data', () => {
    const encPath = path.join(process.cwd(), 'src', 'lib', 'encryption.ts');
    expect(fs.existsSync(encPath)).toBe(true);
  });
});

describe('next.config.ts integration', () => {
  it('imports SECURITY_HEADERS from config SSOT', () => {
    const configPath = path.join(process.cwd(), 'next.config.ts');
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain("import { SECURITY_HEADERS }");
    expect(content).toContain("./src/config/security");
  });

  it('does not duplicate header definitions inline', () => {
    const configPath = path.join(process.cwd(), 'next.config.ts');
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).not.toContain("X-Content-Type-Options");
  });
});

describe('No secrets in codebase', () => {
  const searchPaths = [
    'src/config/strings.ts',
    'src/config/colors.ts',
    'src/config/security.ts',
    'src/lib/auth/config.ts',
    'src/lib/payment/razorpay.ts',
  ];

  it.each(searchPaths)('%s contains no hardcoded secrets', (filePath) => {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) return;
    const content = fs.readFileSync(fullPath, 'utf-8');
    expect(content).not.toMatch(/sk_live_/);
    expect(content).not.toMatch(/rzp_live_/);
    expect(content).not.toMatch(/AIza[A-Za-z0-9_-]{35}/);
    expect(content).not.toMatch(/-----BEGIN (RSA )?PRIVATE KEY-----/);
  });
});
