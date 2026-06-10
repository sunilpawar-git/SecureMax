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
    let cancelled = false;
    async function fetchFollowUps() {
      try {
        const res = await fetch('/api/admin/followup');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (!cancelled) setItems(data.items ?? []);
      } catch {
        if (!cancelled) setError(FOLLOWUP_STRINGS.LOAD_ERROR);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchFollowUps();
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading, error };
}
