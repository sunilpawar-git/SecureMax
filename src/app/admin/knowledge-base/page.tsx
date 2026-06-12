'use client';

/**
 * Knowledge Base admin page — MVVM orchestrator.
 * Data via useKnowledgeBase. Views: DomainStatsGrid, UploadModal.
 */

import { useState } from 'react';
import { useKnowledgeBase } from './_hooks/useKnowledgeBase';
import { DomainStatsGrid } from './_components/DomainStatsGrid';
import { UploadModal } from './_components/UploadModal';

export default function KnowledgeBasePage() {
  const kb = useKnowledgeBase();
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Knowledge Base</h1>
        <div className="flex gap-3">
          <button
            onClick={() => kb.refresh()}
            disabled={kb.loading}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 transition-colors"
          >
            Upload Document
          </button>
        </div>
      </div>

      {kb.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-800 dark:text-red-300">
          {kb.error}
        </div>
      )}

      {kb.lastUpload && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm text-green-800 dark:text-green-300">
          Upload complete: {kb.lastUpload.inserted} chunks inserted, {kb.lastUpload.skipped} skipped
          (delta processing).
        </div>
      )}

      {kb.loading ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">Loading stats...</div>
      ) : kb.stats ? (
        <DomainStatsGrid domains={kb.stats.domains} total={kb.stats.total} />
      ) : null}

      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUpload={kb.uploadDocument}
        uploading={kb.uploading}
      />
    </div>
  );
}
