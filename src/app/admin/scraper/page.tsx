'use client';

/**
 * Scraper & Threat Intel page — thin MVVM orchestrator.
 * Data via useScraperData. Views: SourceHealth, FilterPanel, ArticleList, ManualAddModal.
 */

import { useState } from 'react';
import { useScraperData } from './_hooks/useScraperData';
import { SourceHealth } from './_components/SourceHealth';
import { FilterPanel } from './_components/FilterPanel';
import { ArticleList } from './_components/ArticleList';
import { ManualAddModal } from './_components/ManualAddModal';

export default function ScraperPage() {
  const data = useScraperData();
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Scraper & Threat Intel</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Add Article
          </button>
          <button
            onClick={data.runScraper}
            disabled={data.isRunning}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 disabled:opacity-50 transition-colors"
          >
            {data.isRunning ? 'Running...' : 'Run Scraper'}
          </button>
        </div>
      </div>

      {data.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-800 dark:text-red-300">
          {data.error}
        </div>
      )}

      {data.health && (
        <SourceHealth sources={data.health.sources} nextRun={data.health.next_scheduled_run} />
      )}

      <FilterPanel
        search={data.filters.search}
        domains={data.filters.domains}
        source={data.filters.source}
        onSearchChange={data.setSearch}
        onDomainsChange={data.setDomains}
        onSourceChange={data.setSource}
      />

      <ArticleList
        articles={data.articles}
        total={data.totalArticles}
        onDelete={data.deleteArticle}
      />

      {showAddModal && (
        <ManualAddModal onAdd={data.addArticle} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
