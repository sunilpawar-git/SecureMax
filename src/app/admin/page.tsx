'use client';

import { useState, useEffect } from 'react';

interface DashboardStats {
  scraperHealthy: boolean;
  totalArticles: number;
  pendingLeads: number;
  reportsGenerated: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    scraperHealthy: true,
    totalArticles: 0,
    pendingLeads: 0,
    reportsGenerated: 0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) setStats(await res.json());
      } catch {
        /* dashboard gracefully degrades */
      }
    }
    loadStats();
  }, []);

  const cards = [
    {
      label: 'Scraper Status',
      value: stats.scraperHealthy ? 'Healthy' : 'Degraded',
      color: stats.scraperHealthy ? 'text-green-600' : 'text-red-600',
    },
    {
      label: 'Threat Intel Articles',
      value: stats.totalArticles.toString(),
      color: 'text-slate-900',
    },
    {
      label: 'Pending Enterprise Leads',
      value: stats.pendingLeads.toString(),
      color: 'text-amber-600',
    },
    {
      label: 'Reports Generated',
      value: stats.reportsGenerated.toString(),
      color: 'text-slate-900',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-lg border p-5">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
