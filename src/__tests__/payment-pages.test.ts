/**
 * Phase 3 — Payment pages, enterprise proposal, dashboard, and Razorpay hook.
 * Verifies modules export valid defaults and hooks have correct signatures.
 */

import * as PaymentPageModule from '@/app/(app)/payment/[sessionId]/page';
import * as ProposalPageModule from '@/app/(app)/enterprise/proposal/page';
import * as DashboardPageModule from '@/app/(app)/dashboard/page';
import * as RazorpayModule from '@/hooks/use-razorpay';

describe('Payment pages export valid modules', () => {
  it('payment/[sessionId]/page.tsx exports a default function', () => {
    expect(typeof PaymentPageModule.default).toBe('function');
  });

  it('enterprise/proposal/page.tsx exports a default function', () => {
    expect(typeof ProposalPageModule.default).toBe('function');
  });

  it('dashboard/page.tsx exports a default function', () => {
    expect(typeof DashboardPageModule.default).toBe('function');
  });
});

describe('RazorPay checkout hook', () => {
  it('useRazorpay is a named export function', () => {
    expect(typeof RazorpayModule.useRazorpay).toBe('function');
  });
});
