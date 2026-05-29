/**
 * Enterprise leads business logic — CRUD, status transitions, side effects.
 * All state-changing operations log to AdminAction and validate transitions.
 */

import { prisma } from '@/lib/prisma';
import { logAdminAction } from './actions';
import { sendLeadEmail } from './email';
import { toJsonValue } from '@/lib/prisma-utils';
import {
  VALID_LEAD_TRANSITIONS,
  LEAD_STATUS,
  FOLLOW_UP_STATUS,
  ADMIN_ACTION_TYPE,
  ADMIN_ENTITY_TYPE,
  ADMIN_ERR,
  ADMIN_EMAIL_TEMPLATES,
  FOLLOW_UP_DAYS,
} from '@/config/admin-strings';

export interface LeadFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getLeads(filters: LeadFilters = {}) {
  const { status, search, page = 1, limit = 50 } = filters;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { company: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [leads, total] = await Promise.all([
    prisma.enterpriseLead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.enterpriseLead.count({ where }),
  ]);

  return { leads, total, page, limit };
}

export interface StatusUpdateResult {
  success: boolean;
  error?: string;
  lead?: unknown;
}

export async function updateLeadStatus(
  leadId: string,
  newStatus: string,
  adminId: string,
): Promise<StatusUpdateResult> {
  const lead = await prisma.enterpriseLead.findUnique({ where: { id: leadId } });
  if (!lead) return { success: false, error: ADMIN_ERR.LEAD_NOT_FOUND };

  const allowed = VALID_LEAD_TRANSITIONS[lead.status];
  if (!allowed?.includes(newStatus)) {
    return { success: false, error: ADMIN_ERR.INVALID_STATUS_TRANSITION };
  }

  const updateData: Record<string, unknown> = { status: newStatus };

  if (newStatus === LEAD_STATUS.PROPOSAL_SENT) {
    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + FOLLOW_UP_DAYS);
    updateData.followUpDueAt = dueAt;

    await prisma.followUpReminder.create({
      data: { leadId, dueAt, status: FOLLOW_UP_STATUS.PENDING },
    });

    // SECURITY: Do NOT set paid:true here. Enterprise payment is confirmed separately
    // via admin "Unlock Report" action after PO/invoice is received — not by CRM status.
    // Setting paid:true from a CRM transition bypasses payment verification entirely.

    if (lead.email) {
      await sendLeadEmail({
        to: lead.email,
        subject: ADMIN_EMAIL_TEMPLATES.PROPOSAL_SUBJECT,
        body: ADMIN_EMAIL_TEMPLATES.PROPOSAL_BODY_PREFIX,
      });
      updateData.lastEmailSentAt = new Date();
    }
  }

  const updated = await prisma.enterpriseLead.update({
    where: { id: leadId },
    data: updateData,
  });

  await logAdminAction({
    adminId,
    actionType: ADMIN_ACTION_TYPE.LEAD_STATUS_CHANGED,
    entityType: ADMIN_ENTITY_TYPE.LEAD,
    entityId: leadId,
    metadata: toJsonValue({ oldStatus: lead.status, newStatus }),
  });

  return { success: true, lead: updated };
}

export interface EmailSendResult {
  success: boolean;
  error?: string;
}

export async function sendEmailToLead(
  leadId: string,
  subject: string,
  body: string,
  adminId: string,
): Promise<EmailSendResult> {
  const lead = await prisma.enterpriseLead.findUnique({ where: { id: leadId } });
  if (!lead) return { success: false, error: ADMIN_ERR.LEAD_NOT_FOUND };
  if (!lead.email) return { success: false, error: ADMIN_ERR.LEAD_NO_EMAIL };

  const result = await sendLeadEmail({ to: lead.email, subject, body });
  if (!result.success) return { success: false, error: result.error };

  await prisma.enterpriseLead.update({
    where: { id: leadId },
    data: { lastEmailSentAt: new Date() },
  });

  await logAdminAction({
    adminId,
    actionType: ADMIN_ACTION_TYPE.EMAIL_SENT,
    entityType: ADMIN_ENTITY_TYPE.LEAD,
    entityId: leadId,
    metadata: toJsonValue({ subject }),
  });

  return { success: true };
}
