'use client';

/**
 * Report Management page — thin orchestrator.
 * Data via useReportsData hook. Views: ReportsTable, DiffModal, RegenConfirmDialog.
 */

import { useState } from 'react';
import { useReportsData } from './_hooks/useReportsData';
import { ReportsTable } from './_components/ReportsTable';
import { DiffModal } from './_components/DiffModal';
import { RegenConfirmDialog } from './_components/RegenConfirmDialog';
import type { DiffResult } from '@/lib/admin/diff-engine';

export default function ReportsPage() {
  const data = useReportsData();
  const [regenTarget, setRegenTarget] = useState<string | null>(null);
  const [diffState, setDiffState] = useState<{ sessionId: string; diff: DiffResult } | null>(null);

  async function handleRegenConfirm() {
    if (!regenTarget) return;
    await data.regenerate(regenTarget);
    setRegenTarget(null);
  }

  async function handleViewDiff(sessionId: string) {
    const diff = await data.fetchDiff(sessionId);
    if (diff) setDiffState({ sessionId, diff });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Report Management</h1>
        <button
          onClick={data.refresh}
          disabled={data.loading}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
        >
          {data.loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {data.error ? (
        <p className="text-sm text-red-600">{data.error}</p>
      ) : (
        <ReportsTable
          reports={data.reports}
          onRegenerate={setRegenTarget}
          onUnlock={(sid) => data.unlock(sid)}
          onViewDiff={handleViewDiff}
        />
      )}

      {regenTarget && (
        <RegenConfirmDialog
          sessionId={regenTarget}
          onConfirm={handleRegenConfirm}
          onCancel={() => setRegenTarget(null)}
        />
      )}

      {diffState && (
        <DiffModal
          sessionId={diffState.sessionId}
          diff={diffState.diff}
          onClose={() => setDiffState(null)}
        />
      )}
    </div>
  );
}
