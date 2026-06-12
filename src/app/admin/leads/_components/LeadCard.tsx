'use client';

/**
 * Lead card — displays lead info with status badge and action buttons.
 */

import Link from 'next/link';
import { LEAD_STATUS_STYLES, PAID_STATUS_STYLES } from '@/config/admin-colors';
import {
  LEAD_STATUS_LABEL,
  VALID_LEAD_TRANSITIONS,
  COUPON_STRINGS,
  MARK_PAID_STRINGS,
  LEAD_CARD_STRINGS,
} from '@/config/admin-strings';
import type { Lead } from '../_hooks/useLeadsData';

interface LeadCardProps {
  lead: Lead;
  onStatusChange: (leadId: string, newStatus: string) => void;
  onEmail: (lead: Lead) => void;
  onMarkPaid?: (lead: Lead) => void;
}

function isOverdue(dueAt: string | null): boolean {
  if (!dueAt) return false;
  return new Date(dueAt) < new Date();
}

export function LeadCard({ lead, onStatusChange, onEmail, onMarkPaid }: LeadCardProps) {
  const statusStyle =
    LEAD_STATUS_STYLES[lead.status] ??
    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  const transitions = VALID_LEAD_TRANSITIONS[lead.status] ?? [];
  const overdue = isOverdue(lead.followUpDueAt);

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-lg border p-4 space-y-3 ${
        overdue
          ? 'border-red-300 ring-1 ring-red-200 dark:border-red-700 dark:ring-red-900/50'
          : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{lead.company}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{lead.name}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusStyle}`}>
          {LEAD_STATUS_LABEL[lead.status] ?? lead.status}
        </span>
      </div>

      {lead.email && (
        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{lead.email}</p>
      )}

      {overdue && (
        <p className="text-xs text-red-600 dark:text-red-400 font-medium">Follow-up overdue</p>
      )}

      {lead.couponCode && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {COUPON_STRINGS.LEAD_COUPON_LABEL}{' '}
          <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
            {lead.couponCode}
          </span>
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {transitions.map((target) => (
          <button
            key={target}
            onClick={() => onStatusChange(lead.id, target)}
            className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {LEAD_STATUS_LABEL[target] ?? target}
          </button>
        ))}
        {lead.email && (
          <button
            onClick={() => onEmail(lead)}
            className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
          >
            Email
          </button>
        )}
        {lead.sourceSessionId && (
          <Link
            href={`/enterprise/proposal?session=${lead.sourceSessionId}`}
            className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {LEAD_CARD_STRINGS.VIEW_PROPOSAL}
          </Link>
        )}
        {lead.sourceSessionId && lead.sessionPaid === false && onMarkPaid && (
          <button
            onClick={() => onMarkPaid(lead)}
            className="text-xs px-2 py-1 rounded border border-green-300 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors"
          >
            {MARK_PAID_STRINGS.CTA}
          </button>
        )}
        {lead.sessionPaid === true && (
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium self-center ${PAID_STATUS_STYLES.paid}`}
          >
            {MARK_PAID_STRINGS.PAID_BADGE}
          </span>
        )}
      </div>
    </div>
  );
}
