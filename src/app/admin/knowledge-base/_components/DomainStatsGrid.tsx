'use client';

import { CPP_DOMAINS } from '@/config';

interface Props {
  domains: Record<string, number>;
  total: number;
}

export function DomainStatsGrid({ domains, total }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Domain Coverage
        </h3>
        <span className="text-sm text-slate-500 dark:text-slate-400">{total} total chunks</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.values(CPP_DOMAINS).map((d) => (
          <div
            key={d.code}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4"
          >
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{d.code}</div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {domains[d.code] ?? 0}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{d.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
