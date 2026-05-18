'use client';

/**
 * Confirmation dialog before changing a lead's status.
 */

import { LEAD_STATUS_LABEL } from '@/config/admin-strings';

interface StatusConfirmDialogProps {
  leadCompany: string;
  currentStatus: string;
  targetStatus: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function StatusConfirmDialog({
  leadCompany,
  currentStatus,
  targetStatus,
  onConfirm,
  onCancel,
}: StatusConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Confirm Status Change</h2>
        <p className="text-sm text-slate-600 mb-4">
          Move <span className="font-medium">{leadCompany}</span> from{' '}
          <span className="font-medium">{LEAD_STATUS_LABEL[currentStatus]}</span> to{' '}
          <span className="font-medium">{LEAD_STATUS_LABEL[targetStatus]}</span>?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="text-sm px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="text-sm px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
