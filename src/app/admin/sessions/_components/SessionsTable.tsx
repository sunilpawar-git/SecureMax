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
    return <p className="text-sm text-slate-400 text-center py-8">No sessions found.</p>;
  }

  return (
    <div className="bg-white rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Session</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">User</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Track</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Paid</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Report</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.id.slice(0, 8)}...</td>
              <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-[160px]">
                {s.userEmail ?? '—'}
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TRACK_BADGE_STYLES[s.track] ?? ''}`}>
                  {s.track}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SESSION_STATUS_STYLES[s.status] ?? ''}`}>
                  {s.status.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-xs">{s.paid ? 'Yes' : 'No'}</td>
              <td className="px-4 py-3 text-xs">{s.reportReady ? 'Ready' : '—'}</td>
              <td className="px-4 py-3 text-xs text-slate-400">
                {new Date(s.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                {s.status === SESSION_STATUS.IN_PROGRESS && (
                  <button
                    onClick={() => onForceClose(s.id)}
                    className="text-xs text-red-600 hover:underline"
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
