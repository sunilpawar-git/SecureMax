'use client';

/**
 * ViewModel hook for admin dashboard — fetches stats, action items, recent activity.
 * View components consume this; no data fetching in views.
 */

import { useState, useEffect, useCallback } from 'react';

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

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json() as Promise<T>;
}

export function useDashboardData(): DashboardData {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [actionItems, setActionItems] = useState<ActionItems | null>(null);
  const [recentActivity, setRecentActivity] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, a, r] = await Promise.all([
        fetchJson<DashboardStats>('/api/admin/stats'),
        fetchJson<ActionItems>('/api/admin/action-items'),
        fetchJson<AdminAction[]>('/api/admin/recent-activity'),
      ]);
      setStats(s);
      setActionItems(a);
      setRecentActivity(r);
    } catch (err) {
      setError('Failed to load dashboard data — check network or re-login.');
      void Promise.resolve(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      await load();
      if (!cancelled) {
        // load() already updated state via dispatch
      }
    };
    void fetchData();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { stats, actionItems, recentActivity, loading, error, refresh: load };
}
