'use client';

/**
 * Admin API keys page — thin orchestrator over useApiKeysData (MVVM).
 */

import { useState } from 'react';
import { useApiKeysData } from './_hooks/useApiKeysData';
import { ApiKeysTable } from './_components/ApiKeysTable';
import { AddKeyModal } from './_components/AddKeyModal';
import { RotateKeyDialog } from './_components/RotateKeyDialog';
import { API_KEYS_STRINGS } from '@/config/admin-strings';
import { UI } from '@/config/strings';

export default function ApiKeysPage() {
  const data = useApiKeysData();
  const [showAdd, setShowAdd] = useState(false);
  const [rotateTarget, setRotateTarget] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const handleImport = async () => {
    setImportMessage(null);
    setImportMessage(await data.importFromEnv());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {API_KEYS_STRINGS.TITLE}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {API_KEYS_STRINGS.SUBTITLE}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => {
              void handleImport();
            }}
            disabled={data.importing}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            {data.importing ? API_KEYS_STRINGS.IMPORTING : API_KEYS_STRINGS.IMPORT_CTA}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800"
          >
            {API_KEYS_STRINGS.ADD_KEY}
          </button>
        </div>
      </div>

      {importMessage && (
        <p className="text-sm text-slate-600 dark:text-slate-300">{importMessage}</p>
      )}
      {data.error && <p className="text-sm text-red-600 dark:text-red-400">{data.error}</p>}
      {data.loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{UI.LOADING}</p>
      ) : (
        <ApiKeysTable keys={data.keys} onRotate={setRotateTarget} />
      )}

      {showAdd && <AddKeyModal onConfirm={data.addKey} onClose={() => setShowAdd(false)} />}
      {rotateTarget && (
        <RotateKeyDialog
          provider={rotateTarget}
          onConfirm={data.rotateKey}
          onClose={() => setRotateTarget(null)}
        />
      )}
    </div>
  );
}
