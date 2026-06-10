/**
 * Enterprise leads business logic — CRUD, status transitions, side effects.
 * All state-changing operations log to AdminAction and validate transitions.
 */

import { prisma } from '@/lib/prisma';
import { logAdminAction } from './actions';
import { sendLeadEmail } from './email';
import { createLeadCoupon } from './coupon-service';
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
  MARK_PAID_STRINGS,
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

  // Enrich with linked session payment state so the UI can show Mark Paid / Paid
  const sessionIds = leads
    .map((l) => l.sourceSessionId)
    .filter((id): id is string => typeof id === 'string');
  const paidSessions =
    sessionIds.length > 0
      ? await prisma.auditSession.findMany({
          where: { id: { in: sessionIds } },
          select: { id: true, paid: true },
        })
      : [];
  const paidById = new Map(paidSessions.map((s) => [s.id, s.paid]));

  return {
    leads: leads.map((l) => ({
      ...l,
      sessionPaid: l.sourceSessionId ? (paidById.get(l.sourceSessionId) ?? null) : null,
    })),
    total,
    page,
    limit,
  };
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
  let dueAt: Date | null = null;

  if (newStatus === LEAD_STATUS.PROPOSAL_SENT) {
    dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + FOLLOW_UP_DAYS);
    updateData.followUpDueAt = dueAt;

    // SECURITY: Do NOT set paid:true here. Enterprise payment is confirmed separately
    // via admin "Unlock Report" action after PO/invoice is received — not by CRM status.
    // Setting paid:true from a CRM transition bypasses payment verification entirely.

    // Auto-generate a single-use pilot coupon the first time a proposal goes out.
    // Idempotent (guarded by lead.couponCode, which createLeadCoupon persists
    // itself), so it is safe before the transaction: a coupon left on a lead
    // whose transition then fails is unredeemed and reused on retry.
    if (!lead.couponCode) {
      const coupon = await createLeadCoupon(adminId, leadId, lead.company);
      updateData.couponCode = coupon.code;
    }
  }

  // Reminder + status flip commit atomically: a partial failure can no longer
  // leave a reminder for a lead still in its old status, and a retried
  // transition cannot duplicate reminders.
  const updated = await prisma.$transaction(async (tx) => {
    if (newStatus === LEAD_STATUS.PROPOSAL_SENT && dueAt) {
      await tx.followUpReminder.create({
        data: { leadId, dueAt, status: FOLLOW_UP_STATUS.PENDING },
      });
    }
    return tx.enterpriseLead.update({ where: { id: leadId }, data: updateData });
  });

  // Email is sent only after the CRM state is committed — an email failure
  // must never roll back (or resend on retry of) the transition.
  if (newStatus === LEAD_STATUS.PROPOSAL_SENT && lead.email) {
    await sendLeadEmail({
      to: lead.email,
      subject: ADMIN_EMAIL_TEMPLATES.PROPOSAL_SUBJECT,
      body: ADMIN_EMAIL_TEMPLATES.PROPOSAL_BODY_PREFIX,
    });
    await prisma.enterpriseLead.update({
      where: { id: leadId },
      data: { lastEmailSentAt: new Date() },
    });
  }

  await logAdminAction({
    adminId,
    actionType: ADMIN_ACTION_TYPE.LEAD_STATUS_CHANGED,
    entityType: ADMIN_ENTITY_TYPE.LEAD,
    entityId: leadId,
    metadata: toJsonValue({ oldStatus: lead.status, newStatus }),
  });

  return { success: true, lead: updated };
}

/**
 * Marks an enterprise lead's linked session as paid + unlocks the enterprise
 * report. Manual payment confirmation path (PO/invoice) — Razorpay is not
 * involved for enterprise deals. Logs invoiceRef in the audit trail.
 */
export async function markLeadSessionPaid(
  leadId: string,
  adminId: string,
  invoiceRef?: string,
): Promise<StatusUpdateResult> {
  const lead = await prisma.enterpriseLead.findUnique({ where: { id: leadId } });
  if (!lead) return { success: false, error: ADMIN_ERR.LEAD_NOT_FOUND };
  if (!lead.sourceSessionId) {
    return { success: false, error: MARK_PAID_STRINGS.ERR_NO_SESSION };
  }

  const session = await prisma.auditSession.findUnique({
    where: { id: lead.sourceSessionId },
  });
  if (!session) return { success: false, error: ADMIN_ERR.SESSION_NOT_FOUND };
  if (session.paid) return { success: false, error: MARK_PAID_STRINGS.ERR_ALREADY_PAID };

  // Strip angle brackets and cap length — invoiceRef lands in audit metadata
  const safeInvoiceRef = invoiceRef?.replace(/[<>]/g, '').slice(0, 200) || null;

  await prisma.auditSession.update({
    where: { id: lead.sourceSessionId },
    data: { paid: true, enterpriseReportUnlocked: true },
  });

  await logAdminAction({
    adminId,
    actionType: ADMIN_ACTION_TYPE.LEAD_MARKED_PAID,
    entityType: ADMIN_ENTITY_TYPE.LEAD,
    entityId: leadId,
    metadata: toJsonValue({ sessionId: lead.sourceSessionId, invoiceRef: safeInvoiceRef }),
  });

  return { success: true, lead };
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
