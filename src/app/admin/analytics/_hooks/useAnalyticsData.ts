'use client';

/**
 * ViewModel hook for the analytics page — single fetch of base KPIs plus the
 * Phase 10 extensions (funnel, payment split, session health, LinkedIn ROI).
 */

import { useEffect, useState, useCallback } from 'react';
import { ANALYTICS_STRINGS } from '@/config/analytics-strings';
import type {
  RevenueSplit,
  FunnelStage,
  SessionHealth,
  WeeklyRoiPoint,
} from '@/lib/admin/analytics-service';

export interface AnalyticsData {
  sessions: {
    total: number;
    completed: number;
    abandoned: number;
    avgQuestionsPerSession: number;
  };
  revenue: {
    totalPaid: number;
    amountCollected: number;
    conversionRate: number;
  };
  domains: Record<string, { avgScore: number; questionCount: number }>;
  trends: { date: string; sessions: number; completions: number }[];
  revenueSplit: RevenueSplit;
  funnel: FunnelStage[];
  sessionHealth: SessionHealth;
  linkedinRoi: WeeklyRoiPoint[];
}

export interface AnalyticsState {
  data: AnalyticsData | null;
  loading: boolean;
  error: string | null;
}

export function useAnalyticsData(): AnalyticsState {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal: AbortSignal) => {
    try {
      const res = await fetch('/api/admin/analytics', { signal });
      if (!res.ok) throw new Error(ANALYTICS_STRINGS.LOAD_ERROR);
      setData(await res.json());
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : ANALYTICS_STRINGS.LOAD_ERROR);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on mount
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { data, loading, error };
}
