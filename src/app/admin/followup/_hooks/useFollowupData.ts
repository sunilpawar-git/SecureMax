'use client';

/**
 * ViewModel for the HNI follow-up page — owns fetching and load/error state
 * so page.tsx stays a thin orchestrator (MVVM convention).
 */

import { useEffect, useState } from 'react';
import { FOLLOWUP_STRINGS } from '@/config/admin-strings';

export interface FollowUpItemView {
  sessionId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  userPhone: string | null;
  downloadedAt: string | null;
  followupDueAt: string | null;
  status: 'overdue' | 'due_today' | 'upcoming';
  track: string;
}

export function useFollowupData() {
  const [items, setItems] = useState<FollowUpItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on mount
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch('/api/admin/followup', { signal });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setItems(data.items ?? []);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError(FOLLOWUP_STRINGS.LOAD_ERROR);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  return { items, loading, error };
}
