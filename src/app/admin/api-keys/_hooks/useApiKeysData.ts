'use client';

/**
 * ViewModel hook for the admin API keys page — list, add, rotate.
 * Talks to the existing action-based contract:
 *   GET  /api/admin/api-keys            → masked list
 *   POST /api/admin/api-keys?action=store|rotate
 */

import { useState, useEffect, useCallback } from 'react';
import { API_KEYS_STRINGS } from '@/config/admin-strings';

export interface ApiKeyRow {
  id: string;
  provider: string;
  status: string;
  maskedKey: string | null;
  createdAt: string;
  rotatedAt: string | null;
  lastUsedAt: string | null;
}

export interface ApiKeysData {
  keys: ApiKeyRow[];
  loading: boolean;
  error: string | null;
  addKey: (provider: string, keyValue: string) => Promise<string | null>;
  rotateKey: (provider: string, newKeyValue: string) => Promise<string | null>;
  refresh: () => void;
}

export function useApiKeysData(): ApiKeysData {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/api-keys');
      if (!res.ok) throw new Error('Failed');
      const json = (await res.json()) as { keys?: ApiKeyRow[] };
      setKeys(json.keys ?? []);
    } catch {
      setError(API_KEYS_STRINGS.ERR_LOAD);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on mount
    void load();
  }, [load]);

  /** Returns null on success, an error message on failure. */
  const mutate = useCallback(
    async (action: 'store' | 'rotate', body: Record<string, string>): Promise<string | null> => {
      try {
        const res = await fetch(`/api/admin/api-keys?action=${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const errJson = (await res.json().catch(() => ({}))) as { error?: string };
          return errJson.error ?? API_KEYS_STRINGS.ERR_SAVE;
        }
        await load();
        return null;
      } catch {
        return API_KEYS_STRINGS.ERR_SAVE;
      }
    },
    [load],
  );

  const addKey = useCallback(
    (provider: string, keyValue: string) =>
      mutate('store', { provider, keyName: provider, keyValue }),
    [mutate],
  );

  const rotateKey = useCallback(
    (provider: string, newKeyValue: string) => mutate('rotate', { provider, newKeyValue }),
    [mutate],
  );

  return { keys, loading, error, addKey, rotateKey, refresh: load };
}
