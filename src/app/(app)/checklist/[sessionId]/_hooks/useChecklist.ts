'use client';

import { useCallback, useEffect, useState } from 'react';

export interface ChecklistItem {
  id: string;
  domain: string;
  severity: string;
  action: string;
  reference: string;
  checked: boolean;
}

interface ChecklistState {
  items: ChecklistItem[];
  loading: boolean;
  error: string | null;
}

const STORAGE_KEY_PREFIX = 'checklist_progress_';

function getStorageKey(sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}${sessionId}`;
}

function loadProgress(sessionId: string): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(getStorageKey(sessionId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(sessionId: string, progress: Record<string, boolean>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(sessionId), JSON.stringify(progress));
  } catch {
    /* localStorage full or blocked — degrade gracefully */
  }
}

export function useChecklist(sessionId: string, reportId: string) {
  const [state, setState] = useState<ChecklistState>({
    items: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!sessionId || !reportId) return;

    async function fetchChecklist() {
      try {
        const res = await fetch(
          `/api/report?action=checklist&report_id=${encodeURIComponent(reportId)}`,
        );
        if (!res.ok) {
          setState({ items: [], loading: false, error: 'Failed to load checklist' });
          return;
        }
        const data = await res.json();
        const progress = loadProgress(sessionId);
        const items: ChecklistItem[] = (data.items || []).map((item: ChecklistItem) => ({
          ...item,
          checked: progress[item.id] ?? false,
        }));
        setState({ items, loading: false, error: null });
      } catch {
        setState({ items: [], loading: false, error: 'Network error' });
      }
    }

    fetchChecklist();
  }, [sessionId, reportId]);

  const toggleItem = useCallback(
    (itemId: string) => {
      setState((prev) => {
        const updated = prev.items.map((item) =>
          item.id === itemId ? { ...item, checked: !item.checked } : item,
        );
        const progress: Record<string, boolean> = {};
        updated.forEach((item) => {
          progress[item.id] = item.checked;
        });
        saveProgress(sessionId, progress);
        return { ...prev, items: updated };
      });
    },
    [sessionId],
  );

  const completedCount = state.items.filter((i) => i.checked).length;
  const totalCount = state.items.length;

  return { ...state, toggleItem, completedCount, totalCount };
}
