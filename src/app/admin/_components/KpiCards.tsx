'use client';

/**
 * KPI cards row — pure view component for dashboard stats.
 */

import { SCRAPER_HEALTH_STYLES } from '@/config/admin-colors';

interface Stats {
  activeSessions: number;
  completedSessions: number;
  pendingLeads: number;
  totalLeads: number;
  reportsGenerated: number;
  totalArticles: number;
  scraperHealthy: boolean;
}

interface KpiCardsProps {
  stats: Stats;
}

interface CardDef {
  label: string;
  value: string;
  className: string;
}

export function KpiCards({ stats }: KpiCardsProps) {
  const healthKey = stats.scraperHealthy ? 'healthy' : 'failed';

  const cards: CardDef[] = [
    {
      label: 'Active Sessions',
      value: stats.activeSessions.toString(),
      className: 'text-blue-700',
    },
    {
      label: 'Completed Sessions',
      value: stats.completedSessions.toString(),
      className: 'text-slate-900',
    },
    {
      label: 'Pending Leads',
      value: stats.pendingLeads.toString(),
      className: stats.pendingLeads > 0 ? 'text-amber-600' : 'text-slate-900',
    },
    {
      label: 'Reports Generated',
      value: stats.reportsGenerated.toString(),
      className: 'text-slate-900',
    },
    {
      label: 'Threat Intel Articles',
      value: stats.totalArticles.toString(),
      className: 'text-slate-900',
    },
    {
      label: 'Scraper Health',
      value: stats.scraperHealthy ? 'Healthy' : 'Failed',
      className: SCRAPER_HEALTH_STYLES[healthKey].replace('bg-', 'text-').replace(/text-\S+\s/, ''),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-sm transition-shadow"
        >
          <p className="text-sm text-slate-500 font-medium">{card.label}</p>
          <p className={`text-2xl font-bold mt-1 ${card.className}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
