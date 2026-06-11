'use client';

/**
 * ViewModel hook for admin dashboard — fetches stats, action items, recent activity.
 * View components consume this; no data fetching in views.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/** Silent background refresh cadence — 5 minutes. */
export const DASHBOARD_AUTO_REFRESH_MS = 300_000;

interface DashboardStats {
  activeSessions: number;
  completedSessions: number;
  pendingLeads: number;
  totalLeads: number;
  reportsGenerated: number;
  totalArticles: number;
  scraperHealthy: boolean;
}

interface ActionItems {
  overdueFollowUps: number;
  scraperFailures: number;
  newLeadsCount: number;
}

interface AdminAction {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export interface DashboardData {
  stats: DashboardStats | null;
  actionItems: ActionItems | null;
  recentActivity: AdminAction[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, signal ? { signal } : undefined);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json() as Promise<T>;
}

export function useDashboardData(): DashboardData {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [actionItems, setActionItems] = useState<ActionItems | null>(null);
  const [recentActivity, setRecentActivity] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Silent refreshes skip the loading flag so the UI doesn't flicker every 5 min
  const load = useCallback(async (silent = false) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const [s, a, r] = await Promise.all([
        fetchJson<DashboardStats>('/api/admin/stats', signal),
        fetchJson<ActionItems>('/api/admin/action-items', signal),
        fetchJson<AdminAction[]>('/api/admin/recent-activity', signal),
      ]);
      setStats(s);
      setActionItems(a);
      setRecentActivity(r);
      if (silent) setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (!silent) {
        setError('Failed to load dashboard data — check network or re-login.');
      }
    } finally {
      if (!signal.aborted && !silent) setLoading(false);
    }
  }, []);

  // timerEpoch bump restarts the interval, so a manual refresh resets the 5-min clock
  const [timerEpoch, setTimerEpoch] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on mount
    void load();
    return () => { abortRef.current?.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      void load(true);
    }, DASHBOARD_AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [load, timerEpoch]);

  const refresh = useCallback(() => {
    setTimerEpoch((e) => e + 1);
    void load();
  }, [load]);

  return { stats, actionItems, recentActivity, loading, error, refresh };
}
