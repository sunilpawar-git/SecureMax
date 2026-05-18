'use client';

/**
 * Recent activity feed — last N admin actions displayed in a compact timeline.
 */

import { ACTION_TYPE_STYLES } from '@/config/admin-colors';
import { ADMIN_ACTION_TYPE } from '@/config/admin-strings';

interface AdminAction {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

interface RecentActivityProps {
  actions: AdminAction[];
}

const ACTION_LABELS: Record<string, string> = {
  [ADMIN_ACTION_TYPE.LEAD_STATUS_CHANGED]: 'Changed lead status',
  [ADMIN_ACTION_TYPE.REPORT_REGENERATED]: 'Regenerated report',
  [ADMIN_ACTION_TYPE.REPORT_UNLOCKED]: 'Unlocked report',
  [ADMIN_ACTION_TYPE.SESSION_KILLED]: 'Closed session',
  [ADMIN_ACTION_TYPE.EMAIL_SENT]: 'Sent email',
  [ADMIN_ACTION_TYPE.THREAT_INTEL_ADDED]: 'Added threat intel',
  [ADMIN_ACTION_TYPE.THREAT_INTEL_DELETED]: 'Deleted threat intel',
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RecentActivity({ actions }: RecentActivityProps) {
  if (actions.length === 0) {
    return <p className="text-sm text-slate-400 italic">No recent activity.</p>;
  }

  return (
    <ul className="space-y-2">
      {actions.map((action) => {
        const style = ACTION_TYPE_STYLES[action.actionType] ?? 'bg-gray-100 text-gray-800';
        const label = ACTION_LABELS[action.actionType] ?? action.actionType;
        return (
          <li
            key={action.id}
            className="flex items-center gap-3 text-sm py-2 border-b border-slate-100 last:border-0"
          >
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style}`}>
              {action.entityType}
            </span>
            <span className="text-slate-700 flex-1 truncate">
              {label}
              <span className="text-slate-400 ml-1">#{action.entityId.slice(-6)}</span>
            </span>
            <span className="text-slate-400 text-xs whitespace-nowrap">
              {formatRelativeTime(action.createdAt)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
