'use client';

/**
 * Enterprise Leads page — thin orchestrator.
 * Data via useLeadsData hook. Views: KanbanBoard, EmailModal, StatusConfirmDialog.
 */

import { useState } from 'react';
import { useLeadsData, type Lead } from './_hooks/useLeadsData';
import { KanbanBoard } from './_components/KanbanBoard';
import { EmailModal } from './_components/EmailModal';
import { StatusConfirmDialog } from './_components/StatusConfirmDialog';
import { MarkPaidDialog } from './_components/MarkPaidDialog';
import { LEAD_STATUS, LEAD_STATUS_LABEL } from '@/config/admin-strings';

const STATUS_OPTIONS = ['', ...Object.values(LEAD_STATUS)] as const;

export default function LeadsPage() {
  const data = useLeadsData();
  const [emailTarget, setEmailTarget] = useState<Lead | null>(null);
  const [markPaidTarget, setMarkPaidTarget] = useState<Lead | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    leadId: string;
    company: string;
    currentStatus: string;
    targetStatus: string;
  } | null>(null);

  function handleStatusChange(leadId: string, newStatus: string) {
    const lead = data.leads.find((l) => l.id === leadId);
    if (!lead) return;
    setConfirmAction({
      leadId,
      company: lead.company,
      currentStatus: lead.status,
      targetStatus: newStatus,
    });
  }

  async function handleConfirm() {
    if (!confirmAction) return;
    await data.updateStatus(confirmAction.leadId, confirmAction.targetStatus);
    setConfirmAction(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Enterprise Leads</h1>
        <div className="flex gap-3">
          <select
            value={data.statusFilter}
            onChange={(e) => data.setStatusFilter(e.target.value)}
            className="text-sm rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABEL[s] ?? s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search company or name..."
            value={data.searchQuery}
            onChange={(e) => data.setSearchQuery(e.target.value)}
            className="text-sm rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
          <span className="text-sm text-slate-400 dark:text-slate-500 self-center">
            {data.total} leads
          </span>
        </div>
      </div>

      {data.loading ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">Loading leads...</p>
      ) : data.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{data.error}</p>
      ) : (
        <KanbanBoard
          leads={data.leads}
          onStatusChange={handleStatusChange}
          onEmail={setEmailTarget}
          onMarkPaid={setMarkPaidTarget}
        />
      )}

      {markPaidTarget && (
        <MarkPaidDialog
          lead={markPaidTarget}
          onConfirm={async (invoiceRef) => {
            await data.markPaid(markPaidTarget.id, invoiceRef);
            setMarkPaidTarget(null);
          }}
          onCancel={() => setMarkPaidTarget(null)}
        />
      )}

      {emailTarget && (
        <EmailModal
          lead={emailTarget}
          onSend={data.sendEmail}
          onClose={() => setEmailTarget(null)}
        />
      )}

      {confirmAction && (
        <StatusConfirmDialog
          leadCompany={confirmAction.company}
          currentStatus={confirmAction.currentStatus}
          targetStatus={confirmAction.targetStatus}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
