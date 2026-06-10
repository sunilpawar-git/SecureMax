'use client';

import { ANALYTICS_STRINGS } from '@/config/admin-strings';
import type { RevenueSplit } from '@/lib/admin/analytics-service';

/** Razorpay vs coupon vs manual-unlock payment split with a proportional bar. */
export function RevenueMetricsCard({ split }: { split: RevenueSplit }) {
  const razorpayPct = split.totalPaid > 0 ? (split.razorpayPaid / split.totalPaid) * 100 : 0;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {ANALYTICS_STRINGS.REVENUE_SPLIT_TITLE}
      </h3>

      <div className="grid grid-cols-4 gap-3 text-center">
        <div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {split.totalPaid}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {ANALYTICS_STRINGS.TOTAL_PAID}
          </div>
        </div>
        <div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
            {split.razorpayPaid}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {ANALYTICS_STRINGS.RAZORPAY_PAID}
          </div>
        </div>
        <div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {split.couponPaid}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {ANALYTICS_STRINGS.COUPON_PAID}
          </div>
        </div>
        <div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
            {split.manualPaid}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {ANALYTICS_STRINGS.MANUAL_PAID}
          </div>
        </div>
      </div>

      {split.totalPaid > 0 && (
        <div
          className="h-2 rounded-full bg-emerald-500 overflow-hidden"
          role="img"
          aria-label={`${ANALYTICS_STRINGS.RAZORPAY_PAID}: ${split.razorpayPaid}, ${ANALYTICS_STRINGS.COUPON_PAID}: ${split.couponPaid}, ${ANALYTICS_STRINGS.MANUAL_PAID}: ${split.manualPaid}`}
        >
          <div className="h-full bg-blue-500" style={{ width: `${razorpayPct}%` }} />
        </div>
      )}
    </div>
  );
}
