'use client';

/**
 * Report diff viewer modal — shows added/removed findings and score changes.
 */

import type { DiffResult } from '@/lib/admin/diff-engine';

interface DiffModalProps {
  diff: DiffResult;
  sessionId: string;
  onClose: () => void;
}

export function DiffModal({ diff, sessionId, onClose }: DiffModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            id="dialog-title"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            Report Diff — {sessionId.slice(0, 8)}...
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-lg"
          >
            ✕
          </button>
        </div>

        {diff.urgencyDelta !== 0 && (
          <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">
              Urgency score change:{' '}
            </span>
            <span
              className={
                diff.urgencyDelta > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }
            >
              {diff.urgencyDelta > 0 ? '+' : ''}
              {diff.urgencyDelta}
            </span>
          </div>
        )}

        {diff.scoreChanges.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Domain Score Changes
            </h3>
            <div className="space-y-1">
              {diff.scoreChanges.map((sc) => (
                <div key={sc.domain} className="flex items-center gap-3 text-sm">
                  <span className="text-slate-600 dark:text-slate-300 w-20">{sc.domain}</span>
                  <span className="text-slate-400 dark:text-slate-500">{sc.oldScore}</span>
                  <span className="text-slate-300 dark:text-slate-600">→</span>
                  <span
                    className={
                      sc.newScore > sc.oldScore
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }
                  >
                    {sc.newScore}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {diff.addedFindings.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
              Added Findings ({diff.addedFindings.length})
            </h3>
            <ul className="space-y-1">
              {diff.addedFindings.map((f, i) => (
                <li
                  key={i}
                  className="text-sm text-slate-700 dark:text-slate-200 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded"
                >
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium mr-2">
                    {f.domain}
                  </span>
                  {f.title ?? f.description ?? 'Unnamed finding'}
                </li>
              ))}
            </ul>
          </div>
        )}

        {diff.removedFindings.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
              Removed Findings ({diff.removedFindings.length})
            </h3>
            <ul className="space-y-1">
              {diff.removedFindings.map((f, i) => (
                <li
                  key={i}
                  className="text-sm text-slate-700 dark:text-slate-200 bg-red-50 dark:bg-red-900/30 px-3 py-1.5 rounded"
                >
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium mr-2">
                    {f.domain}
                  </span>
                  {f.title ?? f.description ?? 'Unnamed finding'}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!diff.hasChanges && (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
            No changes between versions.
          </p>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
