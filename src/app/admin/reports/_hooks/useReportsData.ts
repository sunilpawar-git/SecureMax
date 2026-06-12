'use client';

/**
 * ViewModel hook for reports management — fetches, regen, diff, unlock.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DiffResult } from '@/lib/admin/diff-engine';

export interface ReportEntry {
  id: string;
  sessionId: string;
  version: number;
  previousId: string | null;
  track: string;
  sessionStatus: string;
  paid: boolean;
  unlocked: boolean;
  userEmail: string | null;
  urgencyScore: number;
  gapCount: number | null;
  generatedAt: string;
}

export interface ReportsData {
  reports: ReportEntry[];
  loading: boolean;
  error: string | null;
  regenerate: (sessionId: string) => Promise<boolean>;
  unlock: (sessionId: string) => Promise<boolean>;
  fetchDiff: (sessionId: string) => Promise<DiffResult | null>;
  refresh: () => void;
}

export function useReportsData(): ReportsData {
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reports', { signal });
      if (!res.ok) throw new Error('Failed');
      setReports(await res.json());
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('Failed to load reports');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on mount
    void load();
    return () => {
      abortRef.current?.abort();
    };
  }, [load]);

  const regenerate = useCallback(
    async (sessionId: string) => {
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        await load();
        return true;
      }
      return false;
    },
    [load],
  );

  const unlock = useCallback(
    async (sessionId: string) => {
      const res = await fetch(`/api/admin/reports/${sessionId}/unlock`, { method: 'POST' });
      if (res.ok) {
        await load();
        return true;
      }
      return false;
    },
    [load],
  );

  const fetchDiff = useCallback(async (sessionId: string): Promise<DiffResult | null> => {
    const res = await fetch(`/api/admin/reports/${sessionId}/diff`);
    if (!res.ok) return null;
    return res.json();
  }, []);

  return { reports, loading, error, regenerate, unlock, fetchDiff, refresh: load };
}
