'use client';

import { useEffect, useState } from 'react';
import { CPP_DOMAINS } from '@/config/strings';

interface AnalyticsData {
  sessions: {
    total: number;
    completed: number;
    abandoned: number;
    avgQuestionsPerSession: number;
  };
  revenue: {
    totalPaid: number;
    amountCollected: number;
    conversionRate: number;
  };
  domains: Record<string, { avgScore: number; questionCount: number }>;
  trends: { date: string; sessions: number; completions: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/analytics');
        if (!res.ok) throw new Error('Failed to load analytics');
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p className="text-sm text-slate-400">Loading analytics...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Sessions" value={data.sessions.total} />
        <KpiCard label="Completed" value={data.sessions.completed} />
        <KpiCard
          label="Completion Rate"
          value={`${data.sessions.total ? Math.round((data.sessions.completed / data.sessions.total) * 100) : 0}%`}
        />
        <KpiCard label="Avg Questions / Session" value={data.sessions.avgQuestionsPerSession} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Paid Reports" value={data.revenue.totalPaid} />
        <KpiCard
          label="Revenue (INR)"
          value={`₹${(data.revenue.amountCollected / 100).toLocaleString()}`}
        />
        <KpiCard label="Conversion Rate" value={`${data.revenue.conversionRate}%`} />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Domain Performance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.values(CPP_DOMAINS).map((d) => {
            const domainData = data.domains[d.code];
            return (
              <div key={d.code} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium text-emerald-700">{d.code}</div>
                <div className="text-sm font-semibold text-slate-900">{d.name}</div>
                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>Avg Score: {domainData?.avgScore ?? '—'}</span>
                  <span>{domainData?.questionCount ?? 0} questions</span>
                </div>
                {domainData && (
                  <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(domainData.avgScore, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {data.trends.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Session Trends (Last 30 Days)
          </h2>
          <div className="rounded-lg border border-slate-200 bg-white p-4 overflow-x-auto">
            <div className="flex items-end gap-1 h-40">
              {data.trends.map((t) => {
                const maxSessions = Math.max(...data.trends.map((d) => d.sessions), 1);
                const height = (t.sessions / maxSessions) * 100;
                return (
                  <div
                    key={t.date}
                    className="flex flex-col items-center flex-1 min-w-[12px]"
                    title={`${t.date}: ${t.sessions} sessions`}
                  >
                    <div
                      className="w-full bg-emerald-500 rounded-t"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
