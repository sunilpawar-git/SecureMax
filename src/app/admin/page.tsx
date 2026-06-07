'use client';

/**
 * Admin Dashboard — thin orchestrator.
 * Data fetching lives in useDashboardData hook (MVVM ViewModel).
 * Rendering delegated to KpiCards, ActionItems, RecentActivity (Views).
 */

import { useDashboardData } from './_hooks/useDashboardData';
import { KpiCards } from './_components/KpiCards';
import { ActionItems } from './_components/ActionItems';
import { RecentActivity } from './_components/RecentActivity';

const EMPTY_STATS = {
  activeSessions: 0,
  completedSessions: 0,
  pendingLeads: 0,
  totalLeads: 0,
  reportsGenerated: 0,
  totalArticles: 0,
  scraperHealthy: true,
};

const EMPTY_ACTION_ITEMS = {
  overdueFollowUps: 0,
  scraperFailures: 0,
  newLeadsCount: 0,
};

export default function AdminDashboard() {
  const { stats, actionItems, recentActivity, loading, error, refresh } = useDashboardData();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md px-4 py-2">
          {error}
        </p>
      )}
      <KpiCards stats={stats ?? EMPTY_STATS} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Action Items
          </h2>
          <ActionItems items={actionItems ?? EMPTY_ACTION_ITEMS} />
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Recent Activity
          </h2>
          <RecentActivity actions={recentActivity} />
        </section>
      </div>
    </div>
  );
}
