'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useChecklist, type ChecklistItem } from './_hooks/useChecklist';
import { APP } from '@/config/strings';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'border-red-500 bg-red-50 dark:bg-red-900/20',
  high: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
};

function ChecklistCard({
  item,
  onToggle,
}: {
  item: ChecklistItem;
  onToggle: (id: string) => void;
}) {
  const colorClass = SEVERITY_COLORS[item.severity] || 'border-slate-300 bg-slate-50';

  return (
    <button
      onClick={() => onToggle(item.id)}
      className={`w-full text-left p-4 rounded-lg border-l-4 ${colorClass} transition-all ${
        item.checked ? 'opacity-50 line-through' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
            item.checked
              ? 'bg-emerald-600 border-emerald-600'
              : 'border-slate-400'
          }`}
        >
          {item.checked && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.action}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.reference}</p>
        </div>
        <span className="text-xs font-medium uppercase text-slate-500">{item.severity}</span>
      </div>
    </button>
  );
}

export default function ChecklistPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = Array.isArray(params.sessionId)
    ? params.sessionId[0]
    : (params.sessionId ?? '');
  const reportId = searchParams.get('report') ?? sessionId;

  const { items, loading, error, toggleItem, completedCount, totalCount } =
    useChecklist(sessionId, reportId);

  const grouped = items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    (acc[item.domain] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{APP.NAME}</h1>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-slate-500">On-Site Audit Checklist</p>
          {totalCount > 0 && (
            <span className="text-xs font-medium text-emerald-700">
              {completedCount}/{totalCount} complete
            </span>
          )}
        </div>
        {totalCount > 0 && (
          <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        )}
      </header>

      <main className="px-4 py-4 space-y-6">
        {loading && <p className="text-sm text-slate-500 text-center py-8">Loading checklist...</p>}
        {error && <p className="text-sm text-red-600 text-center py-8">{error}</p>}
        {!loading && !error && totalCount === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">No checklist items found.</p>
        )}

        {Object.entries(grouped).map(([domain, domainItems]) => (
          <section key={domain}>
            <h2 className="text-xs font-semibold uppercase text-slate-400 mb-2">{domain}</h2>
            <div className="space-y-2">
              {domainItems.map((item) => (
                <ChecklistCard key={item.id} item={item} onToggle={toggleItem} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
