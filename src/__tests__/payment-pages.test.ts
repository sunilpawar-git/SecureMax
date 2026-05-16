/**
 * Phase 3 — Payment pages, enterprise proposal, dashboard, and Razorpay hook.
 * Verifies modules export valid defaults and hooks have correct signatures.
 */

describe('Payment pages export valid modules', () => {
  it('payment/[sessionId]/page.tsx exports a default function', () => {
    const mod = require('@/app/(app)/payment/[sessionId]/page');
    expect(typeof mod.default).toBe('function');
  });

  it('enterprise/proposal/page.tsx exports a default function', () => {
    const mod = require('@/app/(app)/enterprise/proposal/page');
    expect(typeof mod.default).toBe('function');
  });

  it('dashboard/page.tsx exports a default function', () => {
    const mod = require('@/app/(app)/dashboard/page');
    expect(typeof mod.default).toBe('function');
  });
});

describe('RazorPay checkout hook', () => {
  it('useRazorpay is a named export function', () => {
    const mod = require('@/hooks/use-razorpay');
    expect(typeof mod.useRazorpay).toBe('function');
  });
});
