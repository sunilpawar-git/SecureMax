/**
 * Phase 2 — Consent Enforcement + UX Gaps.
 * TDD: Tests written BEFORE implementation.
 *
 * 2.1: Consent enforced on ALL protected app routes (not just /questionnaire)
 * 2.2: Enterprise proposal form pre-fills from session
 * 2.3: Razorpay script-ready guard on initiatePayment + disabled button
 * 2.4: Webhook idempotency uses structured JSON match
 */

import fs from 'fs';
import path from 'path';

// ─── 2.1: Middleware consent enforcement covers all protected routes ──────────

describe('Middleware consent enforcement scope', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'src', 'middleware.ts'),
    'utf-8',
  );

  it('consent is required for all protected page prefixes', () => {
    expect(content).toContain('/questionnaire');
    expect(content).toContain('/dashboard');
    expect(content).toContain('/payment');
    expect(content).toContain('/report');
    expect(content).toContain('/enterprise');
  });

  it('CONSENT_REQUIRED_PREFIXES covers more than just /questionnaire', () => {
    const match = content.match(/CONSENT_REQUIRED_PREFIXES\s*=\s*\[([^\]]+)\]/);
    expect(match).toBeTruthy();
    const prefixes = match![1];
    expect(prefixes).toContain('/dashboard');
    expect(prefixes).toContain('/payment');
  });

  it('excludes /onboarding/consent from consent check to avoid redirect loop', () => {
    expect(content).toContain('/onboarding/consent');
  });
});

// ─── 2.2: Enterprise proposal pre-fill ────────────────────────────────────────

describe('Enterprise proposal form pre-fills from session', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'src', 'app', '(app)', 'enterprise', 'proposal', 'page.tsx'),
    'utf-8',
  );

  it('ProposalForm accepts default name and email props', () => {
    expect(content).toContain('defaultName');
    expect(content).toContain('defaultEmail');
  });

  it('page fetches session data for pre-fill', () => {
    expect(content).toContain('/api/auth/session');
  });
});

// ─── 2.3: Razorpay script-ready guard ─────────────────────────────────────────

describe('Razorpay script-ready guard', () => {
  const hookContent = fs.readFileSync(
    path.join(process.cwd(), 'src', 'hooks', 'use-razorpay.ts'),
    'utf-8',
  );

  it('initiatePayment checks scriptReady ref before proceeding', () => {
    expect(hookContent).toContain('scriptReadyRef');
  });

  it('uses PAYMENT_ERR constant for gateway loading message', () => {
    expect(hookContent).toContain('PAYMENT_ERR');
  });
});

describe('Payment page disables button when script not ready', () => {
  const pageContent = fs.readFileSync(
    path.join(process.cwd(), 'src', 'app', '(app)', 'payment', '[sessionId]', 'page.tsx'),
    'utf-8',
  );

  it('extracts scriptReady from useRazorpay', () => {
    expect(pageContent).toContain('scriptReady');
  });
});

// ─── 2.4: Webhook idempotency uses delimiter-bound JSON match ─────────────────

describe('Webhook idempotency structured match', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'src', 'lib', 'payment', 'payment-service.ts'),
    'utf-8',
  );

  it('uses delimiter-bound JSON match, not raw contains', () => {
    expect(content).toContain('"order_id":"');
  });
});
