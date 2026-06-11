'use client';

/**
 * ViewModel hook for audit log — fetch, filter, export.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AuditLogEntry } from '@/lib/admin/audit-service';

interface AuditResponse {
  entries: AuditLogEntry[];
  total: number;
}

export interface AuditData {
  entries: AuditLogEntry[];
  total: number;
  loading: boolean;
  actionFilter: string;
  startDate: string;
  endDate: string;
  setActionFilter: (s: string) => void;
  setStartDate: (s: string) => void;
  setEndDate: (s: string) => void;
  exportCsv: () => void;
  refresh: () => void;
}

export function useAuditData(): AuditData {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    setLoading(true);
    const params = new URLSearchParams();
    if (actionFilter) params.set('actionType', actionFilter);
    if (startDate) params.set('startDate', new Date(startDate).toISOString());
    if (endDate) params.set('endDate', new Date(endDate).toISOString());
    try {
      const res = await fetch(`/api/admin/audit-log?${params}`, { signal });
      if (res.ok) {
        const data: AuditResponse = await res.json();
        setEntries(data.entries);
        setTotal(data.total);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      /* graceful */
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [actionFilter, startDate, endDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on filter change
    void load();
    return () => { abortRef.current?.abort(); };
  }, [load]);

  const exportCsv = useCallback(() => {
    const params = new URLSearchParams({ format: 'csv' });
    if (actionFilter) params.set('actionType', actionFilter);
    if (startDate) params.set('startDate', new Date(startDate).toISOString());
    if (endDate) params.set('endDate', new Date(endDate).toISOString());
    window.open(`/api/admin/audit-log?${params}`, '_blank');
  }, [actionFilter, startDate, endDate]);

  return {
    entries,
    total,
    loading,
    actionFilter,
    startDate,
    endDate,
    setActionFilter,
    setStartDate,
    setEndDate,
    exportCsv,
    refresh: load,
  };
}
