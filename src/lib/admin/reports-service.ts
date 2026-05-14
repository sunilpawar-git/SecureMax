/**
 * Report management business logic — list, regen, diff, unlock.
 * All destructive operations log to AdminAction.
 */

import { prisma } from '@/lib/prisma';
import { logAdminAction } from './actions';
import { compareReports, type DiffResult } from './diff-engine';
import { aiServiceFetch } from '@/lib/ai-service';
import {
  ADMIN_ACTION_TYPE,
  ADMIN_ENTITY_TYPE,
  ADMIN_ERR,
  REPORT_JOB_STATUS,
} from '@/config/admin-strings';
import type { Prisma } from '@/generated/prisma/client';

export async function getReports() {
  const reports = await prisma.reportArtifact.findMany({
    orderBy: { generatedAt: 'desc' },
    include: {
      session: {
        select: {
          id: true,
          track: true,
          status: true,
          paid: true,
          enterpriseReportUnlocked: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  return reports.map((r) => ({
    id: r.id,
    sessionId: r.sessionId,
    version: r.version,
    previousId: r.previousId ?? null,
    track: r.session.track,
    sessionStatus: r.session.status,
    paid: r.session.paid,
    unlocked: r.session.enterpriseReportUnlocked,
    userEmail: r.session.user?.email ?? null,
    urgencyScore: r.auditUrgencyScore,
    gapCount: r.complianceGapCount,
    generatedAt: r.generatedAt.toISOString(),
  }));
}

export interface RegenResult {
  success: boolean;
  error?: string;
  jobId?: string;
}

export async function regenerateReport(
  sessionId: string,
  adminId: string,
): Promise<RegenResult> {
  const job = await prisma.reportJob.findUnique({ where: { sessionId } });
  if (
    job &&
    (job.status === REPORT_JOB_STATUS.PENDING ||
      job.status === REPORT_JOB_STATUS.PROCESSING)
  ) {
    return { success: false, error: ADMIN_ERR.REPORT_REGEN_IN_PROGRESS };
  }

  const session = await prisma.auditSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return { success: false, error: ADMIN_ERR.SESSION_NOT_FOUND };
  }

  try {
    const result = await aiServiceFetch('/report/admin-regenerate', {
      body: { session_id: sessionId },
    });
    await logAdminAction({
      adminId,
      actionType: ADMIN_ACTION_TYPE.REPORT_REGENERATED,
      entityType: ADMIN_ENTITY_TYPE.REPORT,
      entityId: sessionId,
    });
    const r = result as { report_id?: string; job_id?: string };
    const jobId = r.report_id ?? r.job_id;
    if (!jobId) {
      console.warn('[reports-service] AI response missing report_id/job_id field', { keys: Object.keys(r) });
    }
    return { success: true, jobId };
  } catch {
    return { success: false, error: ADMIN_ERR.REPORT_REGEN_FAILED };
  }
}

export async function getReportDiff(sessionId: string): Promise<DiffResult | null> {
  const current = await prisma.reportArtifact.findUnique({
    where: { sessionId },
  });
  if (!current || !current.previousId) return null;

  const previous = await prisma.reportArtifact.findUnique({
    where: { id: current.previousId },
  });
  if (!previous) return null;

  return compareReports(
    previous.findingsJson as Record<string, unknown> | null,
    current.findingsJson as Record<string, unknown> | null,
  );
}

export interface UnlockResult {
  success: boolean;
  error?: string;
}

export async function unlockReport(
  sessionId: string,
  adminId: string,
): Promise<UnlockResult> {
  const session = await prisma.auditSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return { success: false, error: ADMIN_ERR.SESSION_NOT_FOUND };
  }

  await prisma.auditSession.update({
    where: { id: sessionId },
    data: { enterpriseReportUnlocked: true },
  });

  await logAdminAction({
    adminId,
    actionType: ADMIN_ACTION_TYPE.REPORT_UNLOCKED,
    entityType: ADMIN_ENTITY_TYPE.REPORT,
    entityId: sessionId,
  });

  return { success: true };
}
