/**
 * HNI follow-up service — queries paid HNI sessions where report was downloaded
 * but no physical audit booking has been confirmed.
 * Computes follow-up urgency and provides WhatsApp/email action URLs.
 */

import { prisma } from '@/lib/prisma';
import { FOLLOWUP_STRINGS } from '@/config/admin-strings';
import { TRACK } from '@/config/strings';

export interface FollowUpItem {
  sessionId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  downloadedAt: Date | null;
  followupDueAt: Date | null;
  status: 'overdue' | 'due_today' | 'upcoming';
  track: string;
}

export function computeFollowUpStatus(dueAt: Date): 'overdue' | 'due_today' | 'upcoming' {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);

  if (dueAt < todayStart) return 'overdue';
  if (dueAt < todayEnd) return 'due_today';
  return 'upcoming';
}

export function buildWhatsAppUrl(phone: string): string {
  const encoded = encodeURIComponent(FOLLOWUP_STRINGS.WHATSAPP_MESSAGE);
  return `https://wa.me/${phone}?text=${encoded}`;
}

export async function getFollowUpList(): Promise<FollowUpItem[]> {
  const sessions = await prisma.auditSession.findMany({
    where: {
      paid: true,
      track: TRACK.HNI,
      reportReady: true,
      postDownloadFollowupAt: { not: null },
    },
    select: {
      id: true,
      userId: true,
      downloadedAt: true,
      postDownloadFollowupAt: true,
      track: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { postDownloadFollowupAt: 'asc' },
  });

  return sessions.map((s) => ({
    sessionId: s.id,
    userId: s.userId,
    userName: s.user.name,
    userEmail: s.user.email,
    downloadedAt: s.downloadedAt,
    followupDueAt: s.postDownloadFollowupAt,
    status: s.postDownloadFollowupAt ? computeFollowUpStatus(s.postDownloadFollowupAt) : 'upcoming',
    track: s.track,
  }));
}
