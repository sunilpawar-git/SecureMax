/**
 * Admin email alerts — Resend-backed notifications for key business events.
 * Every function is fire-and-forget: failures are logged, never thrown, so an
 * alert problem can never break the user-facing flow that triggered it.
 *
 * Daily-digest de-duplication uses AdminAction (actionType: alert_digest_sent)
 * as a timestamp store. Pragmatic reuse of an existing immutable table — if
 * alert types grow beyond the current set, refactor to a dedicated AlertLog.
 */

import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { sendLeadEmail } from './email';
import { logAdminAction } from './actions';
import type { FollowUpItem } from './followup-service';
import {
  ALERT_STRINGS,
  ADMIN_ACTION_TYPE,
  ADMIN_ENTITY_TYPE,
  SCRAPER_RUN_STATUS,
} from '@/config/admin-strings';

async function sendAdminAlert(subject: string, body: string): Promise<void> {
  try {
    const to = env.ADMIN_EMAIL;
    if (!to) {
      logger.warn('ADMIN_EMAIL not set — alert skipped', 'alert-service');
      return;
    }
    await sendLeadEmail({ to, subject, body });
  } catch (err) {
    logger.error('Alert send failed', 'alert-service', { detail: String(err) });
  }
}

export interface NewLeadAlertInput {
  id: string;
  company: string;
  name: string;
  email: string | null;
}

export async function sendNewLeadAlert(lead: NewLeadAlertInput): Promise<void> {
  const body = [
    'A new enterprise lead just arrived.',
    '',
    `Company: ${lead.company}`,
    `Contact: ${lead.name}`,
    `Email: ${lead.email ?? 'not provided'}`,
    `Lead ID: ${lead.id}`,
    '',
    'Review it in the admin panel: /admin/leads',
  ].join('\n');
  await sendAdminAlert(ALERT_STRINGS.NEW_LEAD_SUBJECT, body);
}

export interface ReportDownloadAlertInput {
  sessionId: string;
  userEmail: string;
  userName: string | null;
}

export async function sendReportDownloadAlert(input: ReportDownloadAlertInput): Promise<void> {
  const body = [
    'A paid report was just downloaded for the first time.',
    '',
    `User: ${input.userName ?? 'Unknown'} (${input.userEmail})`,
    `Session: ${input.sessionId}`,
    '',
    'Follow-up is scheduled — see /admin/followup',
  ].join('\n');
  await sendAdminAlert(ALERT_STRINGS.REPORT_DOWNLOAD_SUBJECT, body);
}

export async function sendOverdueFollowupDigest(items: FollowUpItem[]): Promise<void> {
  if (items.length === 0) return;
  const lines = items.map(
    (i) => `- ${i.userName ?? 'Unknown'} (${i.userEmail}) — session ${i.sessionId}`,
  );
  const body = [
    `${items.length} HNI follow-up(s) are overdue:`,
    '',
    ...lines,
    '',
    'Act on them: /admin/followup',
  ].join('\n');
  await sendAdminAlert(ALERT_STRINGS.OVERDUE_DIGEST_SUBJECT, body);
}

export interface ScraperRunAlertInput {
  id: string;
  status: string;
  articlesFound: number;
  startedAt: Date;
}

export async function sendScraperFailureAlert(run: ScraperRunAlertInput): Promise<void> {
  // A failed run and a successful run that found nothing are different events:
  // distinct subjects keep a quiet news day from reading like an outage.
  const failed = run.status === SCRAPER_RUN_STATUS.FAILED;
  const subject = failed
    ? ALERT_STRINGS.SCRAPER_FAILURE_SUBJECT
    : ALERT_STRINGS.SCRAPER_ZERO_SUBJECT;
  const headline = failed
    ? 'The latest scraper run FAILED.'
    : 'The latest scraper run completed but found 0 articles (Rule 12 — surfaced, not silent).';
  const reason = failed ? `status: ${run.status}` : `0 articles found (status: ${run.status})`;
  const body = [
    headline,
    '',
    `Run ID: ${run.id}`,
    `Problem: ${reason}`,
    `Started: ${run.startedAt.toISOString()}`,
    '',
    'Inspect it: /admin/scraper',
  ].join('\n');
  await sendAdminAlert(subject, body);
}

/** True when no digest has been recorded since UTC midnight. */
async function shouldSendDailyDigest(): Promise<boolean> {
  const now = new Date();
  const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const existing = await prisma.adminAction.findFirst({
    where: {
      actionType: ADMIN_ACTION_TYPE.ALERT_DIGEST_SENT,
      createdAt: { gte: utcMidnight },
    },
  });
  return existing === null;
}

/**
 * Daily alert sweep — invoked from the follow-up GET (first admin visit of the
 * day triggers it). Sends at most one digest per UTC day, covering:
 *   1. overdue HNI follow-ups
 *   2. latest scraper run failure / zero-result run (DB-flag approach — no
 *      FastAPI → Next.js callback, no new inbound auth surface)
 */
export async function maybeSendDailyAlerts(adminId: string, items: FollowUpItem[]): Promise<void> {
  try {
    const overdue = items.filter((i) => i.status === 'overdue');

    const latestRun = await prisma.scraperRun.findFirst({
      orderBy: { startedAt: 'desc' },
    });
    const scraperProblem =
      latestRun &&
      (latestRun.status === SCRAPER_RUN_STATUS.FAILED || latestRun.articlesFound === 0);

    if (overdue.length === 0 && !scraperProblem) return;
    if (!(await shouldSendDailyDigest())) return;

    if (overdue.length > 0) await sendOverdueFollowupDigest(overdue);
    if (scraperProblem && latestRun) await sendScraperFailureAlert(latestRun);

    await logAdminAction({
      adminId,
      actionType: ADMIN_ACTION_TYPE.ALERT_DIGEST_SENT,
      entityType: ADMIN_ENTITY_TYPE.ALERT,
      entityId: 'daily-digest',
      metadata: {
        overdueCount: overdue.length,
        scraperAlert: Boolean(scraperProblem),
      },
    });
  } catch (err) {
    logger.error('Daily alert sweep failed', 'alert-service', { detail: String(err) });
  }
}
