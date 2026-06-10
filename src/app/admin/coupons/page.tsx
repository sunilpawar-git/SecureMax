'use client';

/**
 * Coupons admin page — MVVM orchestrator.
 * State in useCouponsData; rendering in _components.
 */

import { useState } from 'react';
import { COUPON_STRINGS } from '@/config/admin-strings';
import { COUPON_PAGE_STYLES } from '@/config/admin-colors';
import { useCouponsData } from './_hooks/useCouponsData';
import { CouponsTable } from './_components/CouponsTable';
import { CreateCouponModal } from './_components/CreateCouponModal';
import { RevokeCouponDialog } from './_components/RevokeCouponDialog';

const FILTERS = ['', 'active', 'redeemed', 'revoked', 'expired'] as const;

const FILTER_LABELS: Record<string, string> = {
  '': COUPON_STRINGS.FILTER_ALL,
  active: COUPON_STRINGS.STATUS_ACTIVE,
  redeemed: COUPON_STRINGS.STATUS_REDEEMED,
  revoked: COUPON_STRINGS.STATUS_REVOKED,
  expired: COUPON_STRINGS.STATUS_EXPIRED,
};

export default function CouponsPage() {
  const data = useCouponsData();
  const [modalMode, setModalMode] = useState<'single' | 'bulk' | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  async function handleRevokeConfirm() {
    if (revokeTarget) {
      await data.revoke(revokeTarget);
      setRevokeTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {COUPON_STRINGS.PAGE_TITLE}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {COUPON_STRINGS.PAGE_DESCRIPTION}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={data.exportCsvUrl}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            {COUPON_STRINGS.EXPORT_CTA}
          </a>
          <button
            onClick={() => setModalMode('bulk')}
            className={`rounded-lg border px-3 py-2 text-sm ${COUPON_PAGE_STYLES.BULK_BTN}`}
          >
            {COUPON_STRINGS.BULK_CTA}
          </button>
          <button
            onClick={() => setModalMode('single')}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${COUPON_PAGE_STYLES.CREATE_BTN}`}
          >
            {COUPON_STRINGS.CREATE_CTA}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f || 'all'}
            onClick={() => data.setStatusFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              data.statusFilter === f
                ? COUPON_PAGE_STYLES.FILTER_ACTIVE
                : COUPON_PAGE_STYLES.FILTER_INACTIVE
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {data.error && (
        <p className={`text-sm rounded-md px-4 py-2 ${COUPON_PAGE_STYLES.ERROR_BANNER}`}>
          {data.error}
        </p>
      )}

      {data.loading ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 py-8 text-center">
          {COUPON_STRINGS.LOADING}
        </p>
      ) : (
        <>
          <CouponsTable coupons={data.coupons} onRevoke={(code) => setRevokeTarget(code)} />
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {data.total} {COUPON_STRINGS.TOTAL_LABEL}
          </p>
        </>
      )}

      {modalMode && (
        <CreateCouponModal
          mode={modalMode}
          onClose={() => setModalMode(null)}
          onCreate={data.createCoupons}
        />
      )}

      {revokeTarget && (
        <RevokeCouponDialog
          code={revokeTarget}
          onConfirm={() => void handleRevokeConfirm()}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </div>
  );
}
