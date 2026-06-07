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
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
        No reports generated yet.
      </p>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              Session
            </th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              User
            </th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              Track
            </th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              V
            </th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              Urgency
            </th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              Gaps
            </th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              Unlocked
            </th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              Generated
            </th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr
              key={r.id}
              className="border-b border-slate-200 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                {r.sessionId.slice(0, 8)}...
              </td>
              <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                {r.userEmail ?? '—'}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${TRACK_BADGE_STYLES[r.track] ?? ''}`}
                >
                  {r.track}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">v{r.version}</td>
              <td className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-200">
                {r.urgencyScore}
              </td>
              <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                {r.gapCount ?? '—'}
              </td>
              <td className="px-4 py-3 text-xs">
                {r.unlocked || r.paid ? (
                  <span className="text-green-600">Yes</span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500">No</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
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
