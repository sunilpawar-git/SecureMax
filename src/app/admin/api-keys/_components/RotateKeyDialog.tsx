'use client';

import { useState } from 'react';
import { API_KEYS_STRINGS } from '@/config/admin-strings';

interface RotateKeyDialogProps {
  provider: string;
  onConfirm: (provider: string, newKeyValue: string) => Promise<string | null>;
  onClose: () => void;
}

export function RotateKeyDialog({ provider, onConfirm, onClose }: RotateKeyDialogProps) {
  const [newKeyValue, setNewKeyValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const err = await onConfirm(provider, newKeyValue.trim());
    setSaving(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          {API_KEYS_STRINGS.ROTATE_TITLE} — {provider}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{API_KEYS_STRINGS.ROTATE_BODY}</p>

        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">
            {API_KEYS_STRINGS.NEW_KEY_LABEL}
          </span>
          <input
            type="password"
            value={newKeyValue}
            onChange={(e) => setNewKeyValue(e.target.value)}
            placeholder={API_KEYS_STRINGS.KEY_PLACEHOLDER}
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100"
          />
        </label>

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
          >
            {API_KEYS_STRINGS.CANCEL}
          </button>
          <button
            onClick={() => void submit()}
            disabled={saving || newKeyValue.trim().length < 10}
            className="px-4 py-2 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {API_KEYS_STRINGS.CONFIRM_ROTATE}
          </button>
        </div>
      </div>
    </div>
  );
}
