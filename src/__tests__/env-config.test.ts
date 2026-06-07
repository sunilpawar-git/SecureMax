/**
 * Phase 1 — Environment variable lockdown (#10).
 * TDD: tests written BEFORE src/lib/env.ts.
 *
 * Contract:
 *  - validateServerEnv() is a no-op in non-production.
 *  - In production it throws (fail-loud) when a required secret is missing or
 *    still holds a placeholder value, naming the offending var.
 *  - The typed `env` accessor reads process.env LIVE (no memoization) so
 *    lazy-read secrets (encryption key, razorpay) keep working as before.
 */

import { validateServerEnv, env } from '@/lib/env';

const REAL_ENV = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://u:p@db.internal:5432/raivan?sslmode=require',
  NEXTAUTH_URL: 'https://raivanglobal.com',
  NEXTAUTH_SECRET: 'Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MGFiY2RlZg==',
  AI_SERVICE_URL: 'https://ai.internal:8000',
  AI_SERVICE_KEY: 'a-real-strong-service-key-value',
  ENCRYPTION_KEY: 'a'.repeat(64),
};

describe('validateServerEnv', () => {
  it('is a no-op in development even with everything empty', () => {
    expect(() => validateServerEnv({ NODE_ENV: 'development' })).not.toThrow();
  });

  it('is a no-op in test', () => {
    expect(() => validateServerEnv({ NODE_ENV: 'test' })).not.toThrow();
  });

  it('throws in production when required secrets are missing', () => {
    expect(() => validateServerEnv({ NODE_ENV: 'production' })).toThrow();
  });

  it('throws in production when a required var holds a placeholder value', () => {
    expect(() =>
      validateServerEnv({
        ...REAL_ENV,
        NEXTAUTH_SECRET: 'generate-with-openssl-rand-base64-32',
      }),
    ).toThrow(/NEXTAUTH_SECRET/);
  });

  it('throws in production when a var holds a "your-" placeholder', () => {
    expect(() => validateServerEnv({ ...REAL_ENV, AI_SERVICE_KEY: 'your-service-key' })).toThrow(
      /AI_SERVICE_KEY/,
    );
  });

  it('passes in production when all required vars are real', () => {
    expect(() => validateServerEnv(REAL_ENV)).not.toThrow();
  });

  it('names every missing required var in the error message', () => {
    let message = '';
    try {
      validateServerEnv({ NODE_ENV: 'production' });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain('DATABASE_URL');
    expect(message).toContain('ENCRYPTION_KEY');
    expect(message).toContain('AI_SERVICE_KEY');
  });
});

describe('env typed accessor', () => {
  const ORIGINAL = process.env.ADMIN_EMAIL;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = ORIGINAL;
  });

  it('reads process.env live (reflects mutations without re-import)', () => {
    process.env.ADMIN_EMAIL = 'admin@example.com';
    expect(env.ADMIN_EMAIL).toBe('admin@example.com');
    delete process.env.ADMIN_EMAIL;
    expect(env.ADMIN_EMAIL).toBe('');
  });

  it('never returns undefined for a known optional key', () => {
    delete process.env.RESEND_API_KEY;
    expect(env.RESEND_API_KEY).toBe('');
  });
});
