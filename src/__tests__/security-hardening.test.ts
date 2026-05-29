/**
 * Security hardening tests — Phase 9 verification.
 * Verifies OWASP headers, DPDPA compliance structure, PWA manifest.
 */

import { SECURITY_HEADERS, RATE_LIMITS, ENCRYPTION, SESSION_SECURITY } from '@/config/security';
import fs from 'fs';
import path from 'path';
import { checkRateLimit } from '@/lib/rate-limit';

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
    expect(RATE_LIMITS.GLOBAL_MAX_REQUESTS).toBeGreaterThan(RATE_LIMITS.AI_ENDPOINT_MAX_REQUESTS);
  });

  it('rate limiter blocks after max requests', async () => {
    const id = `test-${Date.now()}`;
    const maxReqs = 3;
    const windowMs = 5000;

    for (let i = 0; i < maxReqs; i++) {
      const r = await checkRateLimit(id, windowMs, maxReqs);
      expect(r.allowed).toBe(true);
    }

    const blocked = await checkRateLimit(id, windowMs, maxReqs);
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
    expect(manifest.start_url).toMatch(/^\//); // allows /?source=pwa for install tracking
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
    const consentPath = path.join(process.cwd(), 'src', 'app', 'api', 'consent', 'route.ts');
    expect(fs.existsSync(consentPath)).toBe(true);
  });

  it('encryption utility handles sensitive data', () => {
    const encPath = path.join(process.cwd(), 'src', 'lib', 'encryption.ts');
    expect(fs.existsSync(encPath)).toBe(true);
  });
});

describe('next.config.ts integration', () => {
  it('imports the header + CSP SSOT from config', () => {
    const configPath = path.join(process.cwd(), 'next.config.ts');
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('SECURITY_HEADERS');
    expect(content).toContain('buildContentSecurityPolicy');
    expect(content).toContain('./src/config/security');
  });

  it('does not duplicate header or CSP definitions inline', () => {
    const configPath = path.join(process.cwd(), 'next.config.ts');
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).not.toContain('X-Content-Type-Options');
    // CSP directives must come from the SSOT builder, not be inlined here.
    expect(content).not.toContain("default-src 'self'");
  });
});

describe('Encryption key versioning', () => {
  it('ENCRYPTION.KEY_VERSION_PREFIX exists and is non-empty', () => {
    expect(ENCRYPTION.KEY_VERSION_PREFIX).toBeDefined();
    expect(ENCRYPTION.KEY_VERSION_PREFIX.length).toBeGreaterThan(0);
  });

  it('encrypt() output starts with version prefix v1:', () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    jest.resetModules();
    const { encrypt } = require('@/lib/encryption');
    const result = encrypt('test plaintext');
    expect(result).toMatch(/^v1:/);
  });

  it('decrypt() handles versioned ciphertext correctly', () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    jest.resetModules();
    const { encrypt, decrypt } = require('@/lib/encryption');
    const encrypted = encrypt('round trip test');
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe('round trip test');
  });

  it('decrypt() handles legacy unversioned ciphertext', () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    jest.resetModules();
    const { encrypt, decrypt } = require('@/lib/encryption');
    const versioned = encrypt('legacy test');
    const unversioned = versioned.replace(/^v1:/, '');
    const decrypted = decrypt(unversioned);
    expect(decrypted).toBe('legacy test');
  });
});

describe('SESSION_SECURITY wired to NextAuth config', () => {
  it('auth config consumes SESSION_SECURITY for maxAge', () => {
    const { authConfig } = require('@/lib/auth/config');
    expect(authConfig.session.maxAge).toBe(SESSION_SECURITY.MAX_AGE_SECONDS);
  });

  it('auth config sets cookie name from SESSION_SECURITY', () => {
    const { authConfig } = require('@/lib/auth/config');
    expect(authConfig.cookies.sessionToken.name).toBe(SESSION_SECURITY.COOKIE_NAME);
  });

  it('auth config sets httpOnly from SESSION_SECURITY', () => {
    const { authConfig } = require('@/lib/auth/config');
    expect(authConfig.cookies.sessionToken.options.httpOnly).toBe(SESSION_SECURITY.HTTP_ONLY);
  });

  it('auth config sets sameSite from SESSION_SECURITY', () => {
    const { authConfig } = require('@/lib/auth/config');
    expect(authConfig.cookies.sessionToken.options.sameSite).toBe(SESSION_SECURITY.SAME_SITE);
  });

  it('SESSION_SECURITY maxAge is at least 1 hour', () => {
    expect(SESSION_SECURITY.MAX_AGE_SECONDS).toBeGreaterThanOrEqual(3600);
  });

  it('SESSION_SECURITY cookie is httpOnly', () => {
    expect(SESSION_SECURITY.HTTP_ONLY).toBe(true);
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
