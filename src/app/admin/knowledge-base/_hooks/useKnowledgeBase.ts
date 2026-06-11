'use client';

import { useCallback, useEffect, useReducer } from 'react';

interface DomainStats {
  domains: Record<string, number>;
  total: number;
}

interface UploadResult {
  status: string;
  domain?: string;
  inserted?: number;
  skipped?: number;
  error?: string;
}

interface State {
  stats: DomainStats | null;
  loading: boolean;
  error: string | null;
  uploading: boolean;
  lastUpload: UploadResult | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_OK'; data: DomainStats }
  | { type: 'FETCH_ERR'; msg: string }
  | { type: 'UPLOAD_START' }
  | { type: 'UPLOAD_OK'; result: UploadResult; stats: DomainStats }
  | { type: 'UPLOAD_ERR'; msg: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_OK':
      return { ...state, loading: false, stats: action.data };
    case 'FETCH_ERR':
      return { ...state, loading: false, error: action.msg };
    case 'UPLOAD_START':
      return { ...state, uploading: true, lastUpload: null, error: null };
    case 'UPLOAD_OK':
      return { ...state, uploading: false, lastUpload: action.result, stats: action.stats };
    case 'UPLOAD_ERR':
      return { ...state, uploading: false, error: action.msg };
  }
}

const INITIAL: State = {
  stats: null,
  loading: true,
  error: null,
  uploading: false,
  lastUpload: null,
};

export function useKnowledgeBase() {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  const fetchStats = useCallback(async (signal?: AbortSignal) => {
    dispatch({ type: 'FETCH_START' });
    try {
      const res = await fetch('/api/admin/knowledge-base', signal ? { signal } : undefined);
      if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);
      const json = await res.json();
      dispatch({ type: 'FETCH_OK', data: json.data ?? json });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      dispatch({
        type: 'FETCH_ERR',
        msg: err instanceof Error ? err.message : 'Failed to load stats',
      });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchStats(controller.signal);
    return () => controller.abort();
  }, [fetchStats]);

  const uploadDocument = useCallback(
    async (file: File, domain: string) => {
      dispatch({ type: 'UPLOAD_START' });
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('domain', domain);

        const res = await fetch('/api/admin/knowledge-base', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        const json = await res.json();
        const result: UploadResult = json.data ?? json;

        const statsRes = await fetch('/api/admin/knowledge-base');
        const statsJson = statsRes.ok ? await statsRes.json() : null;
        const stats: DomainStats = statsJson?.data ?? statsJson ?? state.stats!;
        dispatch({ type: 'UPLOAD_OK', result, stats });
      } catch (err) {
        dispatch({
          type: 'UPLOAD_ERR',
          msg: err instanceof Error ? err.message : 'Upload failed',
        });
      }
    },
    [state.stats],
  );

  return { ...state, uploadDocument, refresh: fetchStats };
}
