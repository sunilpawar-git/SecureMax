'use client';

/**
 * Source health table — displays scraper source status indicators.
 */

import { SCRAPER_HEALTH_STYLES } from '@/config/admin-colors';

interface SourceHealthItem {
  is_healthy: boolean;
  consecutive_failures: number;
  total_articles: number;
  last_success: string | null;
}

interface SourceHealthProps {
  sources: Record<string, SourceHealthItem>;
  nextRun: string | null;
}

export function SourceHealth({ sources, nextRun }: SourceHealthProps) {
  const entries = Object.entries(sources);

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-medium text-slate-900 mb-3">Source Health</h3>
      {nextRun && (
        <p className="text-xs text-slate-400 mb-3">
          Next scheduled: {new Date(nextRun).toLocaleString()}
        </p>
      )}
      <div className="space-y-2">
        {entries.map(([name, h]) => {
          const healthKey = h.is_healthy ? 'healthy' : 'failed';
          return (
            <div
              key={name}
              className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0"
            >
              <span className="font-medium text-slate-700">{name}</span>
              <div className="flex items-center gap-3">
                <span className="text-slate-400">{h.total_articles} articles</span>
                {h.last_success && (
                  <span className="text-xs text-slate-400">
                    Last: {new Date(h.last_success).toLocaleDateString()}
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${SCRAPER_HEALTH_STYLES[healthKey]}`}
                >
                  {h.is_healthy ? 'Healthy' : `Failed x${h.consecutive_failures}`}
                </span>
              </div>
            </div>
          );
        })}
        {entries.length === 0 && (
          <p className="text-sm text-slate-400">No source data yet. Run the scraper first.</p>
        )}
      </div>
    </div>
  );
}
