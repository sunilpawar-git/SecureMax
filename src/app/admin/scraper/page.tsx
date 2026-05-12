'use client';

import { useState } from 'react';

interface ScraperRunResult {
  status: string;
  stats: { fetched: number; duplicates: number; stored: number; errors: string[] };
}

interface SourceHealthItem {
  is_healthy: boolean;
  consecutive_failures: number;
  total_articles: number;
  last_success: string | null;
}

export default function ScraperPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<ScraperRunResult | null>(null);
  const [health, setHealth] = useState<Record<string, SourceHealthItem>>({});

  const runScraper = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/admin/scraper', { method: 'POST' });
      if (res.ok) setLastResult(await res.json());
    } finally {
      setIsRunning(false);
      loadHealth();
    }
  };

  const loadHealth = async () => {
    const res = await fetch('/api/admin/scraper?action=health');
    if (res.ok) {
      const data = await res.json();
      setHealth(data.sources || {});
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Scraper Dashboard</h1>
        <button
          onClick={runScraper}
          disabled={isRunning}
          className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm
            font-medium hover:bg-emerald-800 disabled:opacity-50"
        >
          {isRunning ? 'Running...' : 'Run Scraper Now'}
        </button>
      </div>

      {lastResult && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium mb-2">Last Run Results</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">Fetched:</span> {lastResult.stats.fetched}</div>
            <div><span className="text-gray-500">Stored:</span> {lastResult.stats.stored}</div>
            <div><span className="text-gray-500">Duplicates:</span> {lastResult.stats.duplicates}</div>
          </div>
          {lastResult.stats.errors.length > 0 && (
            <div className="mt-2 text-sm text-red-600">
              Errors: {lastResult.stats.errors.join(', ')}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-medium mb-3">Source Health</h3>
        <div className="space-y-2">
          {Object.entries(health).map(([name, h]) => (
            <div key={name} className="flex items-center justify-between text-sm border-b pb-2">
              <span className="font-medium">{name}</span>
              <div className="flex items-center gap-3">
                <span className="text-gray-500">{h.total_articles} articles</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  h.is_healthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {h.is_healthy ? 'Healthy' : `Failed ×${h.consecutive_failures}`}
                </span>
              </div>
            </div>
          ))}
          {Object.keys(health).length === 0 && (
            <p className="text-sm text-gray-400">No source data yet. Run the scraper first.</p>
          )}
        </div>
      </div>
    </div>
  );
}
