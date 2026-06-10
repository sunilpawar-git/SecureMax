'use client';

/**
 * Coupons table — status badges, redemption info, revoke action.
 */

import { COUPON_STRINGS } from '@/config/admin-strings';
import { COUPON_STATUS_STYLES } from '@/config/admin-colors';
import type { CouponRow } from '../_hooks/useCouponsData';

const STATUS_LABELS: Record<CouponRow['status'], string> = {
  active: COUPON_STRINGS.STATUS_ACTIVE,
  redeemed: COUPON_STRINGS.STATUS_REDEEMED,
  revoked: COUPON_STRINGS.STATUS_REVOKED,
  expired: COUPON_STRINGS.STATUS_EXPIRED,
};

interface CouponsTableProps {
  coupons: CouponRow[];
  onRevoke: (code: string) => void;
}

const TH_CLASS =
  'px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase';

export function CouponsTable({ coupons, onRevoke }: CouponsTableProps) {
  if (coupons.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 dark:text-slate-500">
        <p className="text-sm">{COUPON_STRINGS.EMPTY_STATE}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className={TH_CLASS}>{COUPON_STRINGS.COL_CODE}</th>
            <th className={TH_CLASS}>{COUPON_STRINGS.COL_STATUS}</th>
            <th className={TH_CLASS}>{COUPON_STRINGS.COL_NOTE}</th>
            <th className={TH_CLASS}>{COUPON_STRINGS.COL_EXPIRES}</th>
            <th className={TH_CLASS}>{COUPON_STRINGS.COL_REDEEMED_BY}</th>
            <th className={TH_CLASS}>{COUPON_STRINGS.COL_CREATED}</th>
            <th className={TH_CLASS}>{COUPON_STRINGS.COL_ACTION}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {coupons.map((c) => (
            <tr key={c.id} className="bg-white dark:bg-slate-800">
              <td className="px-4 py-3 text-sm font-mono font-medium text-slate-900 dark:text-slate-100">
                {c.code}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${COUPON_STATUS_STYLES[c.status]}`}
                >
                  {STATUS_LABELS[c.status]}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate">
                {c.note ?? '—'}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                {c.expiresAt
                  ? new Date(c.expiresAt).toLocaleDateString()
                  : COUPON_STRINGS.NEVER_EXPIRES}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                {c.redeemedByEmail ?? '—'}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                {new Date(c.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                {c.status === 'active' && (
                  <button
                    onClick={() => onRevoke(c.code)}
                    className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    {COUPON_STRINGS.REVOKE_CTA}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
