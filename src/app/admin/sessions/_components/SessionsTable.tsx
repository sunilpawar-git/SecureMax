'use client';

/**
 * Sessions table — lists sessions with user, track, status, actions.
 */

import { SESSION_STATUS_STYLES, TRACK_BADGE_STYLES } from '@/config/admin-colors';
import { SESSION_STATUS } from '@/config/strings';
import type { SessionEntry } from '../_hooks/useSessionsData';

interface SessionsTableProps {
  sessions: SessionEntry[];
  onForceClose: (sessionId: string) => void;
}

export function SessionsTable({ sessions, onForceClose }: SessionsTableProps) {
  if (sessions.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">No sessions found.</p>;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Session</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">User</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Track</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Status</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Paid</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Report</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Created</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id} className="border-b border-slate-200 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700">
              <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{s.id.slice(0, 8)}...</td>
              <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                {s.userEmail ?? '—'}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${TRACK_BADGE_STYLES[s.track] ?? ''}`}
                >
                  {s.track}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${SESSION_STATUS_STYLES[s.status] ?? ''}`}
                >
                  {s.status.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">{s.paid ? 'Yes' : 'No'}</td>
              <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">{s.reportReady ? 'Ready' : '—'}</td>
              <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
                {new Date(s.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                {s.status === SESSION_STATUS.IN_PROGRESS && (
                  <button
                    onClick={() => onForceClose(s.id)}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Force Close
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
