/**
 * Enterprise proposal/lead management.
 * Captures enterprise contact info for sales-led follow-up.
 */

export interface EnterpriseProposal {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  facilityCount: number;
  reportId: string;
  notes?: string;
}

export interface EnterpriseLead {
  id: string;
  proposal: EnterpriseProposal;
  status: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'closed_won' | 'closed_lost';
  createdAt: string;
  reportUnlocked: boolean;
}

export function validateProposal(data: unknown): EnterpriseProposal | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  const companyName = typeof d.companyName === 'string' ? d.companyName.trim() : '';
  const contactName = typeof d.contactName === 'string' ? d.contactName.trim() : '';
  const contactEmail = typeof d.contactEmail === 'string' ? d.contactEmail.trim() : '';
  const facilityCount = typeof d.facilityCount === 'number' ? d.facilityCount : 0;
  const reportId = typeof d.reportId === 'string' ? d.reportId.trim() : '';

  if (!companyName || !contactName || !contactEmail || !reportId) return null;
  if (!contactEmail.includes('@')) return null;
  if (facilityCount < 1) return null;

  return {
    companyName,
    contactName,
    contactEmail,
    contactPhone: typeof d.contactPhone === 'string' ? d.contactPhone.trim() : undefined,
    facilityCount,
    reportId,
    notes: typeof d.notes === 'string' ? d.notes.trim() : undefined,
  };
}
