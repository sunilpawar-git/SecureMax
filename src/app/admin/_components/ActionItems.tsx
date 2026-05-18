'use client';

/**
 * Action items panel — highlights urgent items needing admin attention.
 */

import { URGENCY_STYLES, URGENCY_BADGE_STYLES } from '@/config/admin-colors';

interface ActionItemsData {
  overdueFollowUps: number;
  scraperFailures: number;
  newLeadsCount: number;
}

interface ActionItemsProps {
  items: ActionItemsData;
}

interface AlertItem {
  label: string;
  count: number;
  href: string;
  urgency: 'critical' | 'warning' | 'info';
}

export function ActionItems({ items }: ActionItemsProps) {
  const alerts: AlertItem[] = [];

  if (items.overdueFollowUps > 0) {
    alerts.push({
      label: 'Overdue follow-ups',
      count: items.overdueFollowUps,
      href: '/admin/leads',
      urgency: 'critical',
    });
  }
  if (items.scraperFailures > 0) {
    alerts.push({
      label: 'Scraper failures (7d)',
      count: items.scraperFailures,
      href: '/admin/scraper',
      urgency: 'warning',
    });
  }
  if (items.newLeadsCount > 0) {
    alerts.push({
      label: 'New leads to review',
      count: items.newLeadsCount,
      href: '/admin/leads',
      urgency: 'info',
    });
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
        All clear — no action items pending.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <a
          key={alert.label}
          href={alert.href}
          className={`flex items-center justify-between rounded-lg border p-4 transition-opacity hover:opacity-80 ${URGENCY_STYLES[alert.urgency]}`}
        >
          <span className="text-sm font-medium">{alert.label}</span>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${URGENCY_BADGE_STYLES[alert.urgency]}`}
          >
            {alert.count}
          </span>
        </a>
      ))}
    </div>
  );
}
