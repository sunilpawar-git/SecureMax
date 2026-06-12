'use client';

import { ANALYTICS_STRINGS } from '@/config/admin-strings';
import type { SessionHealth } from '@/lib/admin/analytics-service';

function formatDuration(ms: number): string {
  if (ms <= 0) return '—';
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function SessionHealthCard({ health }: { health: SessionHealth }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {ANALYTICS_STRINGS.HEALTH_TITLE}
      </h3>

      <div>
        <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {formatDuration(health.avgCompletionMs)}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {ANALYTICS_STRINGS.AVG_COMPLETION}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
          {ANALYTICS_STRINGS.ABANDONMENT_TITLE}
        </h4>
        {health.abandonmentNodes.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {ANALYTICS_STRINGS.ABANDONMENT_EMPTY}
          </p>
        ) : (
          <ul className="space-y-1">
            {health.abandonmentNodes.map((n) => (
              <li
                key={n.nodeId}
                className="flex justify-between text-xs text-slate-600 dark:text-slate-300"
              >
                <span className="font-mono truncate">{n.nodeId}</span>
                <span className="text-slate-400 dark:text-slate-500 shrink-0 ml-2">
                  {n.count} {ANALYTICS_STRINGS.SESSIONS_SUFFIX}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
