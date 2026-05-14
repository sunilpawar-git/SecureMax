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

const EMPTY_STATS: DashboardStats = {
  activeSessions: 0,
  completedSessions: 0,
  pendingLeads: 0,
  totalLeads: 0,
  reportsGenerated: 0,
  totalArticles: 0,
  scraperHealthy: true,
};

const EMPTY_ACTION_ITEMS: ActionItems = {
  overdueFollowUps: 0,
  scraperFailures: 0,
  newLeadsCount: 0,
};

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
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
        fetchJson('/api/admin/stats', EMPTY_STATS),
        fetchJson('/api/admin/action-items', EMPTY_ACTION_ITEMS),
        fetchJson<AdminAction[]>('/api/admin/recent-activity', []),
      ]);
      setStats(s);
      setActionItems(a);
      setRecentActivity(r);
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on mount
    void load();
  }, [load]);

  return { stats, actionItems, recentActivity, loading, error, refresh: load };
}
