'use client';

import { useCallback, useEffect, useReducer } from 'react';
import { LINKEDIN_STRINGS } from '@/config/admin-strings';
import { DRAFT_QUEUE_ACTIONS } from '@/config/admin-colors';

interface LinkedInDraft {
  id: string;
  postText: string;
  status: 'draft' | 'published';
  createdAt: string;
}

interface State {
  drafts: LinkedInDraft[];
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_OK'; drafts: LinkedInDraft[] }
  | { type: 'FETCH_ERR'; msg: string }
  | { type: 'PUBLISHED'; id: string }
  | { type: 'DELETED'; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_OK':
      return { ...state, loading: false, drafts: action.drafts };
    case 'FETCH_ERR':
      return { ...state, loading: false, error: action.msg };
    case 'PUBLISHED':
      return {
        ...state,
        drafts: state.drafts.map((d) => (d.id === action.id ? { ...d, status: 'published' } : d)),
      };
    case 'DELETED':
      return { ...state, drafts: state.drafts.filter((d) => d.id !== action.id) };
  }
}

interface DraftQueueProps {
  /** Pre-fill the page editor with a queued draft (Repost / Edit). */
  onUseDraft?: (text: string, id: string) => void;
}

export function DraftQueue({ onUseDraft }: DraftQueueProps) {
  const [state, dispatch] = useReducer(reducer, { drafts: [], loading: true, error: null });

  const fetchDrafts = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const res = await fetch('/api/admin/linkedin?type=drafts');
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = (await res.json()) as { posts?: LinkedInDraft[] };
      dispatch({ type: 'FETCH_OK', drafts: data.posts ?? [] });
    } catch (err) {
      dispatch({ type: 'FETCH_ERR', msg: err instanceof Error ? err.message : 'Load failed' });
    }
  }, []);

  useEffect(() => {
    void fetchDrafts();
  }, [fetchDrafts]);

  const markPublished = async (id: string) => {
    try {
      await fetch('/api/admin/linkedin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'published' }),
      });
      dispatch({ type: 'PUBLISHED', id });
    } catch {
      /* non-critical */
    }
  };

  const deleteDraft = async (id: string) => {
    if (!window.confirm(LINKEDIN_STRINGS.DELETE_CONFIRM)) return;
    try {
      const res = await fetch(`/api/admin/linkedin?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.status === 204) dispatch({ type: 'DELETED', id });
    } catch {
      /* non-critical */
    }
  };

  const pendingDrafts = state.drafts.filter((d) => d.status === 'draft');

  if (state.loading) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Loading drafts...</div>;
  }

  if (pendingDrafts.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
      <h3 className="font-medium text-amber-900 dark:text-amber-200">
        Pending Drafts ({pendingDrafts.length})
      </h3>
      <div className="space-y-2">
        {pendingDrafts.map((draft) => (
          <div
            key={draft.id}
            className="flex items-start justify-between gap-3 bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                {draft.postText.slice(0, 150)}...
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {new Date(draft.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => onUseDraft?.(draft.postText, draft.id)}
                className={DRAFT_QUEUE_ACTIONS.REPOST}
              >
                {LINKEDIN_STRINGS.REPOST}
              </button>
              <button
                onClick={() => onUseDraft?.(draft.postText, draft.id)}
                className={DRAFT_QUEUE_ACTIONS.EDIT}
              >
                {LINKEDIN_STRINGS.EDIT}
              </button>
              <button
                onClick={() => void deleteDraft(draft.id)}
                className={DRAFT_QUEUE_ACTIONS.DELETE}
              >
                {LINKEDIN_STRINGS.DELETE}
              </button>
              <button
                onClick={() => void markPublished(draft.id)}
                className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700"
              >
                Mark Published
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
