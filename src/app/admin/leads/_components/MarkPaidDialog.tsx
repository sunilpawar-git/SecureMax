'use client';

/**
 * Mark Paid confirmation dialog — manual enterprise payment confirmation
 * (PO/invoice path). Captures an optional invoice reference for the audit trail.
 */

import { useState } from 'react';
import { MARK_PAID_STRINGS } from '@/config/admin-strings';
import type { Lead } from '../_hooks/useLeadsData';

interface MarkPaidDialogProps {
  lead: Lead;
  onConfirm: (invoiceRef?: string) => Promise<void>;
  onCancel: () => void;
}

export function MarkPaidDialog({ lead, onConfirm, onCancel }: MarkPaidDialogProps) {
  const [invoiceRef, setInvoiceRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    await onConfirm(invoiceRef.trim() || undefined);
    setSubmitting(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={MARK_PAID_STRINGS.DIALOG_TITLE}
    >
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {MARK_PAID_STRINGS.DIALOG_TITLE}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          <span className="font-medium">{lead.company}</span> — {MARK_PAID_STRINGS.DIALOG_BODY}
        </p>

        <div>
          <label
            htmlFor="invoice-ref"
            className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
          >
            {MARK_PAID_STRINGS.INVOICE_LABEL}
          </label>
          <input
            id="invoice-ref"
            type="text"
            maxLength={200}
            value={invoiceRef}
            onChange={(e) => setInvoiceRef(e.target.value)}
            placeholder={MARK_PAID_STRINGS.INVOICE_PLACEHOLDER}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm text-slate-700 dark:text-slate-200"
          >
            {MARK_PAID_STRINGS.CANCEL}
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={submitting}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {MARK_PAID_STRINGS.CONFIRM}
          </button>
        </div>
      </div>
    </div>
  );
}
