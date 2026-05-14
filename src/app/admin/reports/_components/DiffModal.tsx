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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Report Diff — {sessionId.slice(0, 8)}...
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">
            ✕
          </button>
        </div>

        {diff.urgencyDelta !== 0 && (
          <div className="mb-4 p-3 rounded-lg bg-slate-50 border text-sm">
            <span className="font-medium text-slate-700">Urgency score change: </span>
            <span className={diff.urgencyDelta > 0 ? 'text-red-600' : 'text-green-600'}>
              {diff.urgencyDelta > 0 ? '+' : ''}{diff.urgencyDelta}
            </span>
          </div>
        )}

        {diff.scoreChanges.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Domain Score Changes</h3>
            <div className="space-y-1">
              {diff.scoreChanges.map((sc) => (
                <div key={sc.domain} className="flex items-center gap-3 text-sm">
                  <span className="text-slate-600 w-20">{sc.domain}</span>
                  <span className="text-slate-400">{sc.oldScore}</span>
                  <span className="text-slate-300">→</span>
                  <span className={sc.newScore > sc.oldScore ? 'text-red-600' : 'text-green-600'}>
                    {sc.newScore}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {diff.addedFindings.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-green-700 mb-2">
              Added Findings ({diff.addedFindings.length})
            </h3>
            <ul className="space-y-1">
              {diff.addedFindings.map((f, i) => (
                <li key={i} className="text-sm text-slate-700 bg-green-50 px-3 py-1.5 rounded">
                  <span className="text-xs text-green-600 font-medium mr-2">{f.domain}</span>
                  {f.title ?? f.description ?? 'Unnamed finding'}
                </li>
              ))}
            </ul>
          </div>
        )}

        {diff.removedFindings.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-red-700 mb-2">
              Removed Findings ({diff.removedFindings.length})
            </h3>
            <ul className="space-y-1">
              {diff.removedFindings.map((f, i) => (
                <li key={i} className="text-sm text-slate-700 bg-red-50 px-3 py-1.5 rounded">
                  <span className="text-xs text-red-600 font-medium mr-2">{f.domain}</span>
                  {f.title ?? f.description ?? 'Unnamed finding'}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!diff.hasChanges && (
          <p className="text-sm text-slate-400 text-center py-4">No changes between versions.</p>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
