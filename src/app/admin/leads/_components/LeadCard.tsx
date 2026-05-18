'use client';

/**
 * Lead card — displays lead info with status badge and action buttons.
 */

import { LEAD_STATUS_STYLES } from '@/config/admin-colors';
import { LEAD_STATUS_LABEL, VALID_LEAD_TRANSITIONS } from '@/config/admin-strings';
import type { Lead } from '../_hooks/useLeadsData';

interface LeadCardProps {
  lead: Lead;
  onStatusChange: (leadId: string, newStatus: string) => void;
  onEmail: (lead: Lead) => void;
}

function isOverdue(dueAt: string | null): boolean {
  if (!dueAt) return false;
  return new Date(dueAt) < new Date();
}

export function LeadCard({ lead, onStatusChange, onEmail }: LeadCardProps) {
  const statusStyle = LEAD_STATUS_STYLES[lead.status] ?? 'bg-gray-100 text-gray-800';
  const transitions = VALID_LEAD_TRANSITIONS[lead.status] ?? [];
  const overdue = isOverdue(lead.followUpDueAt);

  return (
    <div
      className={`bg-white rounded-lg border p-4 space-y-3 ${
        overdue ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-slate-900 truncate">{lead.company}</p>
          <p className="text-xs text-slate-500 truncate">{lead.name}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusStyle}`}>
          {LEAD_STATUS_LABEL[lead.status] ?? lead.status}
        </span>
      </div>

      {lead.email && <p className="text-xs text-slate-400 truncate">{lead.email}</p>}

      {overdue && <p className="text-xs text-red-600 font-medium">Follow-up overdue</p>}

      <div className="flex flex-wrap gap-2">
        {transitions.map((target) => (
          <button
            key={target}
            onClick={() => onStatusChange(lead.id, target)}
            className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {LEAD_STATUS_LABEL[target] ?? target}
          </button>
        ))}
        {lead.email && (
          <button
            onClick={() => onEmail(lead)}
            className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
          >
            Email
          </button>
        )}
      </div>
    </div>
  );
}
