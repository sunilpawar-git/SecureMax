'use client';

/**
 * Kanban board — groups leads by status in columns.
 * Uses HTML5 drag-and-drop for column moves.
 */

import { useState } from 'react';
import { LEAD_STATUS, LEAD_STATUS_LABEL, VALID_LEAD_TRANSITIONS } from '@/config/admin-strings';
import { LeadCard } from './LeadCard';
import type { Lead } from '../_hooks/useLeadsData';

interface KanbanBoardProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: string) => void;
  onEmail: (lead: Lead) => void;
  onMarkPaid?: (lead: Lead) => void;
}

const COLUMNS = [
  LEAD_STATUS.NEW,
  LEAD_STATUS.CONTACTED,
  LEAD_STATUS.PROPOSAL_SENT,
  LEAD_STATUS.CLOSED_WON,
  LEAD_STATUS.CLOSED_LOST,
];

export function KanbanBoard({ leads, onStatusChange, onEmail, onMarkPaid }: KanbanBoardProps) {
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  function handleDragStart(leadId: string) {
    setDragLeadId(leadId);
  }

  function handleDragOver(e: React.DragEvent, columnStatus: string) {
    e.preventDefault();
    setDragOver(columnStatus);
  }

  function handleDrop(targetStatus: string) {
    if (!dragLeadId) return;
    const lead = leads.find((l) => l.id === dragLeadId);
    if (!lead || lead.status === targetStatus) {
      setDragLeadId(null);
      setDragOver(null);
      return;
    }

    const allowed = VALID_LEAD_TRANSITIONS[lead.status] ?? [];
    if (allowed.includes(targetStatus)) {
      onStatusChange(dragLeadId, targetStatus);
    }
    setDragLeadId(null);
    setDragOver(null);
  }

  function handleDragEnd() {
    setDragLeadId(null);
    setDragOver(null);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {COLUMNS.map((status) => {
        const columnLeads = leads.filter((l) => l.status === status);
        const isDragTarget = dragOver === status;
        return (
          <div
            key={status}
            className={`rounded-lg p-3 min-h-[200px] transition-colors ${
              isDragTarget
                ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700'
                : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700'
            }`}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(status)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                {LEAD_STATUS_LABEL[status]}
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {columnLeads.length}
              </span>
            </div>
            <div className="space-y-3">
              {columnLeads.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => handleDragStart(lead.id)}
                  onDragEnd={handleDragEnd}
                  aria-label="Drag to reorder lead"
                  className="cursor-grab active:cursor-grabbing"
                >
                  <LeadCard
                    lead={lead}
                    onStatusChange={onStatusChange}
                    onEmail={onEmail}
                    onMarkPaid={onMarkPaid}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
