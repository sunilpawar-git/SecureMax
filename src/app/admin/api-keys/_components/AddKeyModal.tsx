'use client';

import { useState } from 'react';
import { API_KEYS_STRINGS } from '@/config/admin-strings';
import { API_KEY_PROVIDERS } from '@/lib/admin/validators';

interface AddKeyModalProps {
  onConfirm: (provider: string, keyValue: string) => Promise<string | null>;
  onClose: () => void;
}

export function AddKeyModal({ onConfirm, onClose }: AddKeyModalProps) {
  const [provider, setProvider] = useState<string>(API_KEY_PROVIDERS[0]);
  const [keyValue, setKeyValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const err = await onConfirm(provider, keyValue.trim());
    setSaving(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          {API_KEYS_STRINGS.MODAL_TITLE}
        </h3>

        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">
            {API_KEYS_STRINGS.PROVIDER_LABEL}
          </span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          >
            {API_KEY_PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">{API_KEYS_STRINGS.KEY_LABEL}</span>
          <input
            type="password"
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value)}
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
            disabled={saving || keyValue.trim().length < 10}
            className="px-4 py-2 text-sm rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {API_KEYS_STRINGS.SAVE}
          </button>
        </div>
      </div>
    </div>
  );
}
