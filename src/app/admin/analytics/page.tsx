'use client';

/**
 * Analytics page — thin orchestrator over useAnalyticsData (MVVM).
 * Base KPI/domain/trend sections plus Phase 10 extensions: funnel,
 * payment split, session health, LinkedIn ROI.
 */

import { CPP_DOMAINS } from '@/config/strings';
import { ANALYTICS_STRINGS } from '@/config/admin-strings';
import { useAnalyticsData } from './_hooks/useAnalyticsData';
import { RevenueMetricsCard } from './_components/RevenueMetricsCard';
import { FunnelChart } from './_components/FunnelChart';
import { SessionHealthCard } from './_components/SessionHealthCard';
import { LinkedInROIChart } from './_components/LinkedInROIChart';

export default function AnalyticsPage() {
  const { data, loading, error } = useAnalyticsData();

  if (loading)
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500">{ANALYTICS_STRINGS.LOADING}</p>
    );
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        {ANALYTICS_STRINGS.TITLE}
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={ANALYTICS_STRINGS.KPI.TOTAL_SESSIONS} value={data.sessions.total} />
        <KpiCard label={ANALYTICS_STRINGS.KPI.COMPLETED} value={data.sessions.completed} />
        <KpiCard
          label={ANALYTICS_STRINGS.KPI.COMPLETION_RATE}
          value={`${data.sessions.total ? Math.round((data.sessions.completed / data.sessions.total) * 100) : 0}%`}
        />
        <KpiCard
          label={ANALYTICS_STRINGS.KPI.AVG_QUESTIONS}
          value={data.sessions.avgQuestionsPerSession}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label={ANALYTICS_STRINGS.KPI.PAID_REPORTS} value={data.revenue.totalPaid} />
        <KpiCard
          label={ANALYTICS_STRINGS.KPI.REVENUE_INR}
          value={`₹${(data.revenue.amountCollected / 100).toLocaleString()}`}
        />
        <KpiCard
          label={ANALYTICS_STRINGS.KPI.CONVERSION_RATE}
          value={`${data.revenue.conversionRate}%`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <RevenueMetricsCard split={data.revenueSplit} />
        <SessionHealthCard health={data.sessionHealth} />
      </div>

      <Section title={ANALYTICS_STRINGS.FUNNEL_TITLE}>
        <FunnelChart stages={data.funnel} />
      </Section>

      <Section title={ANALYTICS_STRINGS.ROI_TITLE}>
        <LinkedInROIChart points={data.linkedinRoi} />
      </Section>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {ANALYTICS_STRINGS.DOMAIN_TITLE}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.values(CPP_DOMAINS).map((d) => {
            const domainData = data.domains[d.code];
            return (
              <div
                key={d.code}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
              >
                <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  {d.code}
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {d.name}
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {ANALYTICS_STRINGS.DOMAIN_AVG_SCORE}: {domainData?.avgScore ?? '—'}
                  </span>
                  <span>
                    {domainData?.questionCount ?? 0} {ANALYTICS_STRINGS.DOMAIN_QUESTIONS_SUFFIX}
                  </span>
                </div>
                {domainData && (
                  <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
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
        <Section title={ANALYTICS_STRINGS.TRENDS_TITLE}>
          <div className="flex items-end gap-1 h-40">
            {data.trends.map((t) => {
              const maxSessions = Math.max(...data.trends.map((d) => d.sessions), 1);
              const height = (t.sessions / maxSessions) * 100;
              const trendLabel = `${t.date}: ${t.sessions} ${ANALYTICS_STRINGS.TRENDS_SESSIONS_SUFFIX}`;
              return (
                <div
                  key={t.date}
                  className="flex flex-col items-center flex-1 min-w-[12px]"
                  title={trendLabel}
                  aria-label={trendLabel}
                >
                  <div
                    className="w-full bg-emerald-500 rounded-t"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{title}</h2>
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</div>
      <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}
