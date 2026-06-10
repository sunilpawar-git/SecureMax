'use client';

/**
 * Coupon redemption widget on the payment page.
 * On successful redemption the parent hides the Razorpay flow and this widget
 * shows the unlocked state with a View Report CTA.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PAYMENT_COUPON } from '@/config/strings';

interface CouponRedemptionWidgetProps {
  sessionId: string;
  onRedeemed: () => void;
}

export function CouponRedemptionWidget({ sessionId, onRedeemed }: CouponRedemptionWidgetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState(false);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch('/api/coupon/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), sessionId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || PAYMENT_COUPON.ERROR_GENERIC);
        return;
      }
      setRedeemed(true);
      onRedeemed();
    } catch {
      setError(PAYMENT_COUPON.ERROR_GENERIC);
    } finally {
      setApplying(false);
    }
  }

  if (redeemed) {
    return (
      <div className="border-t border-emerald-200 dark:border-emerald-800 pt-4 space-y-3">
        <p className="text-sm text-emerald-700 dark:text-emerald-300 text-center font-medium">
          {PAYMENT_COUPON.SUCCESS}
        </p>
        <button
          onClick={() => router.push(`/report/${sessionId}/download`)}
          className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
        >
          {PAYMENT_COUPON.VIEW_REPORT}
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline"
        >
          {PAYMENT_COUPON.TOGGLE}
        </button>
      ) : (
        <form onSubmit={(e) => void handleApply(e)} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={PAYMENT_COUPON.PLACEHOLDER}
              aria-label={PAYMENT_COUPON.PLACEHOLDER}
              maxLength={20}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={applying || !code.trim()}
              className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-50"
            >
              {applying ? PAYMENT_COUPON.APPLYING : PAYMENT_COUPON.APPLY}
            </button>
          </div>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </form>
      )}
    </div>
  );
}
