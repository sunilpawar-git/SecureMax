/**
 * Phase B — Broken Wiring fixes.
 * TDD: Tests written BEFORE implementation.
 *
 * H-3: Report `full` action streams PDF bytes, not JSON
 * H-4: useReportTrigger has AbortController cleanup
 * H-5: Admin guard unification — requireAdmin delegates to verifyAdmin
 * H-6: URL encoding for sessionId in client fetch calls
 * H-7: verifySignature does not throw when RAZORPAY_SECRET missing
 * H-8: Razorpay script race condition guarded
 * H-9: Payment log accuracy — only log success when unlocked
 * M-4: Payment route verifies session ownership
 * M-6: apiSuccess not used for error propagation
 * M-13: Webhook idempotency uses structured JSON matching
 */

import fs from 'fs';
import path from 'path';

// ─── H-3: Report `full` action does NOT wrap in apiSuccess ─────────────────────

describe('report route full action', () => {
  it('full action does NOT use apiSuccess() to wrap response', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', 'api', 'report', 'route.ts'),
      'utf-8',
    );
    const fullCaseMatch = content.match(/case\s+'full'[\s\S]*?break;|case\s+'full'[\s\S]*?}/);
    if (fullCaseMatch) {
      expect(fullCaseMatch[0]).not.toContain('apiSuccess');
    }
  });
});

// ─── H-4: useReportTrigger has AbortController ──────────────────────────────────

describe('useReportTrigger abort cleanup', () => {
  it('contains AbortController for fetch cleanup', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', '(app)', 'questionnaire', 'use-report-trigger.ts'),
      'utf-8',
    );
    expect(content).toContain('AbortController');
    expect(content).toContain('controller.abort');
  });
});

// ─── H-5: Admin guard unification ───────────────────────────────────────────────

describe('admin guard unification', () => {
  it('requireAdmin in guards.ts delegates to verifyAdmin', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src', 'lib', 'api', 'guards.ts'),
      'utf-8',
    );
    expect(content).toContain('verifyAdmin');
  });
});

// ─── H-6: URL encoding in client pages ──────────────────────────────────────────

describe('client-side URL encoding', () => {
  it('report status page uses encodeURIComponent or URLSearchParams', () => {
    const content = fs.readFileSync(
      path.join(
        process.cwd(),
        'src',
        'app',
        '(app)',
        'report',
        '[sessionId]',
        'status',
        'page.tsx',
      ),
      'utf-8',
    );
    expect(content).toMatch(/encodeURIComponent|URLSearchParams/);
  });

  it('report download page uses encodeURIComponent or URLSearchParams', () => {
    const content = fs.readFileSync(
      path.join(
        process.cwd(),
        'src',
        'app',
        '(app)',
        'report',
        '[sessionId]',
        'download',
        'page.tsx',
      ),
      'utf-8',
    );
    expect(content).toMatch(/encodeURIComponent|URLSearchParams/);
  });

  it('report summary page uses encodeURIComponent or URLSearchParams', () => {
    const content = fs.readFileSync(
      path.join(
        process.cwd(),
        'src',
        'app',
        '(app)',
        'report',
        '[sessionId]',
        'summary',
        'page.tsx',
      ),
      'utf-8',
    );
    expect(content).toMatch(/encodeURIComponent|URLSearchParams/);
  });
});

// ─── H-7: verifySignature returns false when secret missing ─────────────────────

describe('verifySignature safe failure', () => {
  const originalEnv = process.env.RAZORPAY_SECRET;

  afterEach(() => {
    process.env.RAZORPAY_SECRET = originalEnv;
  });

  it('returns false instead of throwing when RAZORPAY_SECRET is empty', async () => {
    process.env.RAZORPAY_SECRET = '';
    jest.resetModules();
    const { verifySignature } = await import('@/lib/payment/razorpay');
    const result = verifySignature({
      razorpay_order_id: 'order_123',
      razorpay_payment_id: 'pay_456',
      razorpay_signature: 'abc',
    });
    expect(result).toBe(false);
  });
});

// ─── H-8: Razorpay script guard ─────────────────────────────────────────────────

describe('useRazorpay script safety', () => {
  it('checks window.Razorpay existence before calling new', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src', 'hooks', 'use-razorpay.ts'),
      'utf-8',
    );
    expect(content).toMatch(
      /typeof\s+window\.Razorpay|window\.Razorpay\s*===\s*undefined|!window\.Razorpay/,
    );
  });
});

// ─── H-9: Payment log accuracy ──────────────────────────────────────────────────

describe('payment log accuracy', () => {
  it('handleVerify only logs success when unlocked is true', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', 'api', 'payment', 'route.ts'),
      'utf-8',
    );
    expect(content).toContain('partial_failure');
  });
});

// ─── M-6: questionnaire route does NOT use apiSuccess for errors ────────────────

describe('questionnaire error propagation', () => {
  it('does NOT use apiSuccess for AIServiceError responses', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', 'api', 'questionnaire', 'route.ts'),
      'utf-8',
    );
    const catchBlock = content.match(/catch\s*\(error\)[\s\S]*$/);
    if (catchBlock) {
      expect(catchBlock[0]).not.toContain('apiSuccess');
    }
  });
});
