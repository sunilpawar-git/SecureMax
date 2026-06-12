'use client';

/**
 * Revoke confirmation dialog — destructive action requires explicit confirm.
 */

import { COUPON_STRINGS } from '@/config/admin-strings';

interface RevokeCouponDialogProps {
  code: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RevokeCouponDialog({ code, onConfirm, onCancel }: RevokeCouponDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={COUPON_STRINGS.REVOKE_CONFIRM_TITLE}
    >
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {COUPON_STRINGS.REVOKE_CONFIRM_TITLE}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          <span className="font-mono font-medium">{code}</span> —{' '}
          {COUPON_STRINGS.REVOKE_CONFIRM_BODY}
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm text-slate-700 dark:text-slate-200"
          >
            {COUPON_STRINGS.CANCEL}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {COUPON_STRINGS.REVOKE_CTA}
          </button>
        </div>
      </div>
    </div>
  );
}
