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
    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
      <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Source Health</h3>
      {nextRun && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
          Next scheduled: {new Date(nextRun).toLocaleString()}
        </p>
      )}
      <div className="space-y-2">
        {entries.map(([name, h]) => {
          const healthKey = h.is_healthy
            ? h.consecutive_failures > 0
              ? 'degraded'
              : 'healthy'
            : 'failed';
          const healthLabel =
            healthKey === 'healthy'
              ? 'Healthy'
              : healthKey === 'degraded'
                ? `Degraded (${h.consecutive_failures} failure${h.consecutive_failures !== 1 ? 's' : ''})`
                : `Failed x${h.consecutive_failures}`;
          return (
            <div
              key={name}
              className="flex items-center justify-between text-sm border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0"
            >
              <span className="font-medium text-slate-700 dark:text-slate-200">{name}</span>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 dark:text-slate-500">{h.total_articles} articles</span>
                {h.last_success && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    Last: {new Date(h.last_success).toLocaleDateString()}
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${SCRAPER_HEALTH_STYLES[healthKey]}`}
                >
                  {healthLabel}
                </span>
              </div>
            </div>
          );
        })}
        {entries.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500">No source data yet. Run the scraper first.</p>
        )}
      </div>
    </div>
  );
}
