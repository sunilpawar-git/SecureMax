'use client';

/**
 * ViewModel hook for sessions management — fetch, filter, force-close.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

export interface SessionEntry {
  id: string;
  track: string;
  status: string;
  paid: boolean;
  reportReady: boolean;
  userEmail: string | null;
  userName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SessionsResponse {
  sessions: SessionEntry[];
  total: number;
}

export interface SessionsData {
  sessions: SessionEntry[];
  total: number;
  loading: boolean;
  error: string | null;
  statusFilter: string;
  trackFilter: string;
  userIdFilter: string;
  setStatusFilter: (s: string) => void;
  setTrackFilter: (t: string) => void;
  setUserIdFilter: (u: string) => void;
  forceClose: (sessionId: string) => Promise<boolean>;
  refresh: () => void;
}

export function useSessionsData(): SessionsData {
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [trackFilter, setTrackFilter] = useState('');
  // Pre-filter from ?userId= (Users page jump link); null-safe when absent
  const [userIdFilter, setUserIdFilter] = useState(searchParams?.get('userId') ?? '');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (trackFilter) params.set('track', trackFilter);
    if (userIdFilter) params.set('userId', userIdFilter);
    try {
      const res = await fetch(`/api/admin/sessions?${params}`);
      if (!res.ok) {
        setError('Failed to load sessions');
        return;
      }
      const data: SessionsResponse = await res.json();
      setSessions(data.sessions);
      setTotal(data.total);
    } catch {
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, trackFilter, userIdFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on filter change
    void load();
  }, [load]);

  const forceClose = useCallback(
    async (sessionId: string) => {
      const res = await fetch('/api/admin/sessions', {
        method: 'PATCH',
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

  return {
    sessions,
    total,
    loading,
    error,
    statusFilter,
    trackFilter,
    userIdFilter,
    setStatusFilter,
    setTrackFilter,
    setUserIdFilter,
    forceClose,
    refresh: load,
  };
}
