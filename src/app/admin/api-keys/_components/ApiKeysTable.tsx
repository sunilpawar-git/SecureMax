'use client';

/**
 * API keys table — masked previews only, never full key values.
 * Shows a LinkedIn token-age warning when the active linkedin key is
 * older than LINKEDIN_TOKEN_WARN_AGE_DAYS (tokens expire ~day 60).
 */

import { API_KEY_STATUS_STYLES } from '@/config/admin-colors';
import { API_KEYS_STRINGS, LINKEDIN_TOKEN_WARN_AGE_DAYS } from '@/config/admin-strings';
import type { ApiKeyRow } from '../_hooks/useApiKeysData';

interface ApiKeysTableProps {
  keys: ApiKeyRow[];
  onRotate: (provider: string) => void;
}

function isLinkedinTokenStale(keys: ApiKeyRow[]): boolean {
  const active = keys.find((k) => k.provider === 'linkedin' && k.status === 'active');
  if (!active) return false;
  const ageDays = (Date.now() - new Date(active.createdAt).getTime()) / 86_400_000;
  return ageDays > LINKEDIN_TOKEN_WARN_AGE_DAYS;
}

export function ApiKeysTable({ keys, onRotate }: ApiKeysTableProps) {
  if (keys.length === 0) {
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
        {API_KEYS_STRINGS.EMPTY}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {isLinkedinTokenStale(keys) && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {API_KEYS_STRINGS.LINKEDIN_EXPIRY_WARNING}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <tr>
              {[
                API_KEYS_STRINGS.COL_PROVIDER,
                API_KEYS_STRINGS.COL_STATUS,
                API_KEYS_STRINGS.COL_PREVIEW,
                API_KEYS_STRINGS.COL_CREATED,
                API_KEYS_STRINGS.COL_ROTATED,
                API_KEYS_STRINGS.COL_ACTION,
              ].map((col) => (
                <th
                  key={col}
                  className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr
                key={k.id}
                className="border-b border-slate-200 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                  {k.provider}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${API_KEY_STATUS_STYLES[k.status] ?? ''}`}
                  >
                    {API_KEYS_STRINGS.STATUS_LABEL[k.status] ?? k.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {k.maskedKey ? `${API_KEYS_STRINGS.MASK_PREFIX}${k.maskedKey}` : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
                  {new Date(k.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
                  {k.rotatedAt ? new Date(k.rotatedAt).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  {k.status === 'active' && (
                    <button
                      onClick={() => onRotate(k.provider)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {API_KEYS_STRINGS.ROTATE}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
