'use client';

/**
 * Create coupon modal — single or bulk mode, shared form fields.
 * On success shows the generated code(s) for copy-paste.
 */

import { useState } from 'react';
import { COUPON_STRINGS, COUPON_BULK_MAX } from '@/config/admin-strings';
import { COUPON_SUCCESS_TEXT } from '@/config/admin-colors';

interface CreateCouponModalProps {
  mode: 'single' | 'bulk';
  onClose: () => void;
  onCreate: (
    mode: 'single' | 'bulk',
    opts: { count?: number; note?: string; expiresAt?: string },
  ) => Promise<string[] | null>;
}

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export function CreateCouponModal({ mode, onClose, onCreate }: CreateCouponModalProps) {
  const [note, setNote] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [count, setCount] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCodes, setCreatedCodes] = useState<string[] | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const codes = await onCreate(mode, {
      ...(mode === 'bulk' && { count }),
      ...(note.trim() && { note: note.trim() }),
      ...(expiresAt && { expiresAt: new Date(expiresAt).toISOString() }),
    });
    setSubmitting(false);
    if (codes) {
      setCreatedCodes(codes);
    } else {
      setError(COUPON_STRINGS.ERR_CREATE);
    }
  }

  const title =
    mode === 'single' ? COUPON_STRINGS.CREATE_MODAL_TITLE : COUPON_STRINGS.BULK_MODAL_TITLE;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>

        {createdCodes ? (
          <div className="space-y-4">
            <p className={COUPON_SUCCESS_TEXT}>{COUPON_STRINGS.CREATED_LIVE}</p>
            <div className="max-h-48 overflow-y-auto rounded-lg bg-slate-50 dark:bg-slate-900 p-3">
              {createdCodes.map((code) => (
                <p
                  key={code}
                  className="font-mono text-sm text-slate-900 dark:text-slate-100 py-0.5"
                >
                  {code}
                </p>
              ))}
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-slate-900 dark:bg-slate-100 px-4 py-2 text-sm font-medium text-white dark:text-slate-900"
            >
              {COUPON_STRINGS.DONE}
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {mode === 'bulk' && (
              <div>
                <label
                  htmlFor="coupon-count"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                >
                  {COUPON_STRINGS.COUNT_LABEL}
                </label>
                <input
                  id="coupon-count"
                  type="number"
                  min={1}
                  max={COUPON_BULK_MAX}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className={INPUT_CLASS}
                  required
                />
              </div>
            )}

            <div>
              <label
                htmlFor="coupon-note"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
              >
                {COUPON_STRINGS.NOTE_LABEL}
              </label>
              <input
                id="coupon-note"
                type="text"
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={COUPON_STRINGS.NOTE_PLACEHOLDER}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label
                htmlFor="coupon-expires"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
              >
                {COUPON_STRINGS.EXPIRES_LABEL}
              </label>
              <input
                id="coupon-expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm text-slate-700 dark:text-slate-200"
              >
                {COUPON_STRINGS.CANCEL}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting
                  ? COUPON_STRINGS.SUBMITTING
                  : mode === 'single'
                    ? COUPON_STRINGS.SUBMIT_CREATE
                    : COUPON_STRINGS.SUBMIT_BULK}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
