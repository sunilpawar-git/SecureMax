'use client';

/**
 * Audit Log page — thin MVVM orchestrator.
 */

import { useAuditData } from './_hooks/useAuditData';
import { AuditTable } from './_components/AuditTable';
import { DateRangeFilter } from './_components/DateRangeFilter';
import { ADMIN_ACTION_TYPE } from '@/config/admin-strings';

const ACTION_TYPES = ['', ...Object.values(ADMIN_ACTION_TYPE)] as const;

export default function AuditLogPage() {
  const data = useAuditData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Audit Log</h1>
        <button
          onClick={data.exportCsv}
          className="text-sm px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-colors"
        >
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <select
          value={data.actionFilter}
          onChange={(e) => data.setActionFilter(e.target.value)}
          className="text-sm rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Actions</option>
          {ACTION_TYPES.filter(Boolean).map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <DateRangeFilter
          startDate={data.startDate}
          endDate={data.endDate}
          onStartChange={data.setStartDate}
          onEndChange={data.setEndDate}
        />
        <span className="text-sm text-slate-400 dark:text-slate-500">{data.total} entries</span>
      </div>

      {data.loading ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">Loading audit log...</p>
      ) : (
        <AuditTable entries={data.entries} />
      )}
    </div>
  );
}
