/**
 * Phase 5 tests — admin email alert service.
 * Each alert sends to ADMIN_EMAIL with the right subject/body; failures never
 * throw (fire-and-forget); the daily digest de-duplicates per UTC day via
 * AdminAction and also covers scraper failures (DB-flag approach).
 */

const mockSendLeadEmail = jest.fn();
jest.mock('@/lib/admin/email', () => ({
  sendLeadEmail: (...a: unknown[]) => mockSendLeadEmail(...a),
}));

const mockAdminActionFindFirst = jest.fn();
const mockAdminActionCreate = jest.fn();
const mockScraperRunFindFirst = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    adminAction: {
      findFirst: (...a: unknown[]) => mockAdminActionFindFirst(...a),
      create: (...a: unknown[]) => mockAdminActionCreate(...a),
    },
    scraperRun: { findFirst: (...a: unknown[]) => mockScraperRunFindFirst(...a) },
  },
}));

jest.mock('@/lib/env', () => ({
  env: { ADMIN_EMAIL: 'admin@raivan.test' },
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

import {
  sendNewLeadAlert,
  sendReportDownloadAlert,
  sendOverdueFollowupDigest,
  sendScraperFailureAlert,
  maybeSendDailyAlerts,
} from '@/lib/admin/alert-service';
import { ALERT_STRINGS } from '@/config/admin-strings';
import type { FollowUpItem } from '@/lib/admin/followup-service';

function makeFollowUp(status: FollowUpItem['status']): FollowUpItem {
  return {
    sessionId: 'sess-1',
    userId: 'u-1',
    userName: 'Test User',
    userEmail: 't@example.com',
    userPhone: null,
    downloadedAt: new Date(),
    followupDueAt: new Date(),
    status,
    track: 'hni',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSendLeadEmail.mockResolvedValue({ success: true });
  mockAdminActionCreate.mockResolvedValue({ id: 'act-1' });
  mockScraperRunFindFirst.mockResolvedValue(null);
  mockAdminActionFindFirst.mockResolvedValue(null);
});

describe('sendNewLeadAlert', () => {
  it('emails the admin with company and contact details', async () => {
    await sendNewLeadAlert({ id: 'l-1', company: 'Acme', name: 'Jane', email: 'j@acme.com' });
    expect(mockSendLeadEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@raivan.test',
        subject: ALERT_STRINGS.NEW_LEAD_SUBJECT,
        body: expect.stringContaining('Acme'),
      }),
    );
    expect(mockSendLeadEmail.mock.calls[0][0].body).toContain('Jane');
  });

  it('does not throw when the email provider fails', async () => {
    mockSendLeadEmail.mockRejectedValue(new Error('resend down'));
    await expect(
      sendNewLeadAlert({ id: 'l-1', company: 'Acme', name: 'Jane', email: null }),
    ).resolves.toBeUndefined();
  });
});

describe('sendReportDownloadAlert', () => {
  it('includes user and session in the body', async () => {
    await sendReportDownloadAlert({
      sessionId: 'sess-9',
      userEmail: 'hni@example.com',
      userName: 'Rich Client',
    });
    const call = mockSendLeadEmail.mock.calls[0][0];
    expect(call.subject).toBe(ALERT_STRINGS.REPORT_DOWNLOAD_SUBJECT);
    expect(call.body).toContain('sess-9');
    expect(call.body).toContain('hni@example.com');
  });
});

describe('sendOverdueFollowupDigest', () => {
  it('batches all items into one email', async () => {
    await sendOverdueFollowupDigest([makeFollowUp('overdue'), makeFollowUp('overdue')]);
    expect(mockSendLeadEmail).toHaveBeenCalledTimes(1);
    expect(mockSendLeadEmail.mock.calls[0][0].body).toContain('2 HNI follow-up(s)');
  });

  it('sends nothing for an empty list', async () => {
    await sendOverdueFollowupDigest([]);
    expect(mockSendLeadEmail).not.toHaveBeenCalled();
  });
});

describe('sendScraperFailureAlert', () => {
  it('describes a failed run', async () => {
    await sendScraperFailureAlert({
      id: 'run-1',
      status: 'failed',
      articlesFound: 3,
      startedAt: new Date('2026-06-01T02:30:00Z'),
    });
    const call = mockSendLeadEmail.mock.calls[0][0];
    expect(call.subject).toBe(ALERT_STRINGS.SCRAPER_FAILURE_SUBJECT);
    expect(call.body).toContain('status: failed');
  });

  it('describes a zero-result run with a distinct, non-failure subject', async () => {
    await sendScraperFailureAlert({
      id: 'run-2',
      status: 'completed',
      articlesFound: 0,
      startedAt: new Date(),
    });
    const call = mockSendLeadEmail.mock.calls[0][0];
    // A quiet news day must not read like an outage
    expect(call.subject).toBe(ALERT_STRINGS.SCRAPER_ZERO_SUBJECT);
    expect(call.subject).not.toBe(ALERT_STRINGS.SCRAPER_FAILURE_SUBJECT);
    expect(call.body).toContain('0 articles found');
  });
});

describe('maybeSendDailyAlerts — de-duplication and scraper sweep', () => {
  it('sends digest + logs AdminAction when overdue items exist and none sent today', async () => {
    await maybeSendDailyAlerts('admin-1', [makeFollowUp('overdue')]);

    expect(mockSendLeadEmail).toHaveBeenCalledTimes(1);
    expect(mockAdminActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: 'alert_digest_sent',
          adminId: 'admin-1',
        }),
      }),
    );
  });

  it('skips entirely when a digest was already sent today', async () => {
    mockAdminActionFindFirst.mockResolvedValue({ id: 'prev-digest' });
    await maybeSendDailyAlerts('admin-1', [makeFollowUp('overdue')]);
    expect(mockSendLeadEmail).not.toHaveBeenCalled();
    expect(mockAdminActionCreate).not.toHaveBeenCalled();
  });

  it('sends a scraper alert when the latest run failed, even with no overdue items', async () => {
    mockScraperRunFindFirst.mockResolvedValue({
      id: 'run-1',
      status: 'failed',
      articlesFound: 0,
      startedAt: new Date(),
    });
    await maybeSendDailyAlerts('admin-1', [makeFollowUp('upcoming')]);
    expect(mockSendLeadEmail).toHaveBeenCalledTimes(1);
    expect(mockSendLeadEmail.mock.calls[0][0].subject).toBe(ALERT_STRINGS.SCRAPER_FAILURE_SUBJECT);
  });

  it('does nothing when there are no overdue items and the scraper is healthy', async () => {
    mockScraperRunFindFirst.mockResolvedValue({
      id: 'run-1',
      status: 'completed',
      articlesFound: 12,
      startedAt: new Date(),
    });
    await maybeSendDailyAlerts('admin-1', [makeFollowUp('upcoming')]);
    expect(mockSendLeadEmail).not.toHaveBeenCalled();
    expect(mockAdminActionCreate).not.toHaveBeenCalled();
  });

  it('never throws even if Prisma fails', async () => {
    mockScraperRunFindFirst.mockRejectedValue(new Error('db down'));
    await expect(
      maybeSendDailyAlerts('admin-1', [makeFollowUp('overdue')]),
    ).resolves.toBeUndefined();
  });
});
