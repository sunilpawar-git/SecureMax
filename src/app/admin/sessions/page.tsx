'use client';

/**
 * Session Management page — thin MVVM orchestrator.
 */

import { useState } from 'react';
import { useSessionsData } from './_hooks/useSessionsData';
import { SessionsTable } from './_components/SessionsTable';
import { ForceCloseDialog } from './_components/ForceCloseDialog';
import { SESSION_STATUS, TRACK } from '@/config/strings';

const STATUSES = ['', ...Object.values(SESSION_STATUS)] as const;
const TRACKS = ['', ...Object.values(TRACK)] as const;

export default function SessionsPage() {
  const data = useSessionsData();
  const [closeTarget, setCloseTarget] = useState<string | null>(null);

  async function handleConfirm() {
    if (!closeTarget) return;
    await data.forceClose(closeTarget);
    setCloseTarget(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sessions</h1>
        <div className="flex gap-3">
          <select
            value={data.statusFilter}
            onChange={(e) => data.setStatusFilter(e.target.value)}
            className="text-sm rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">All Statuses</option>
            {STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <select
            value={data.trackFilter}
            onChange={(e) => data.setTrackFilter(e.target.value)}
            className="text-sm rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">All Tracks</option>
            {TRACKS.filter(Boolean).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className="text-sm text-slate-400 dark:text-slate-500 self-center">
            {data.total} sessions
          </span>
        </div>
      </div>

      {data.userIdFilter && (
        <p className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-md px-4 py-2 flex items-center justify-between">
          <span>
            Filtered by user: <span className="font-mono">{data.userIdFilter}</span>
          </span>
          <button
            onClick={() => data.setUserIdFilter('')}
            className="font-medium underline hover:no-underline"
          >
            Clear
          </button>
        </p>
      )}

      {data.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md px-4 py-2">
          {data.error}
        </p>
      )}
      {data.loading ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">Loading sessions...</p>
      ) : (
        <SessionsTable sessions={data.sessions} onForceClose={setCloseTarget} />
      )}

      {closeTarget && (
        <ForceCloseDialog
          sessionId={closeTarget}
          onConfirm={handleConfirm}
          onCancel={() => setCloseTarget(null)}
        />
      )}
    </div>
  );
}
