'use client';

/**
 * Reports table — lists all reports with version, track, urgency, actions.
 */

import { TRACK_BADGE_STYLES } from '@/config/admin-colors';
import type { ReportEntry } from '../_hooks/useReportsData';

interface ReportsTableProps {
  reports: ReportEntry[];
  onRegenerate: (sessionId: string) => void;
  onUnlock: (sessionId: string) => void;
  onViewDiff: (sessionId: string) => void;
}

export function ReportsTable({ reports, onRegenerate, onUnlock, onViewDiff }: ReportsTableProps) {
  if (reports.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-8">No reports generated yet.</p>;
  }

  return (
    <div className="bg-white rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Session</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">User</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Track</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">V</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Urgency</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Gaps</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Unlocked</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Generated</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="px-4 py-3 font-mono text-xs text-slate-600">
                {r.sessionId.slice(0, 8)}...
              </td>
              <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-[160px]">
                {r.userEmail ?? '—'}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${TRACK_BADGE_STYLES[r.track] ?? ''}`}
                >
                  {r.track}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">v{r.version}</td>
              <td className="px-4 py-3 text-xs font-medium text-slate-700">{r.urgencyScore}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{r.gapCount ?? '—'}</td>
              <td className="px-4 py-3 text-xs">
                {r.unlocked || r.paid ? (
                  <span className="text-green-600">Yes</span>
                ) : (
                  <span className="text-slate-400">No</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-slate-400">
                {new Date(r.generatedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 flex gap-2">
                <button
                  onClick={() => onRegenerate(r.sessionId)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Regen
                </button>
                {r.version > 1 && r.previousId != null && (
                  <button
                    onClick={() => onViewDiff(r.sessionId)}
                    className="text-xs text-purple-600 hover:underline"
                  >
                    Diff
                  </button>
                )}
                {!r.unlocked && r.track === 'enterprise' && (
                  <button
                    onClick={() => onUnlock(r.sessionId)}
                    className="text-xs text-green-600 hover:underline"
                  >
                    Unlock
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
