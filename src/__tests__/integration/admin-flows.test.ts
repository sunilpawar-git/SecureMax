/**
 * Integration tests for admin flows — verifies cross-service interactions.
 * Tests call service functions directly (not HTTP) to validate business logic chains.
 */

import { ADMIN_ACTION_TYPE, LEAD_STATUS, ADMIN_ERR } from '@/config/admin-strings';
import { SESSION_STATUS } from '@/config/strings';

const mockPrisma = {
  enterpriseLead: { findUnique: jest.fn(), update: jest.fn() },
  followUpReminder: { create: jest.fn() },
  adminAction: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  auditSession: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  reportArtifact: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  threatIntel: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  webhookLog: { create: jest.fn() },
  user: { findMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/admin/email', () => ({
  sendLeadEmail: jest.fn().mockResolvedValue({ success: true }),
}));

import { updateLeadStatus } from '@/lib/admin/leads-service';
import { forceCloseSession } from '@/lib/admin/sessions-service';
import { deleteArticle } from '@/lib/admin/threat-intel-service';
import { getAuditLog } from '@/lib/admin/audit-service';
import { logWebhookSuccess, logWebhookFailure } from '@/lib/admin/webhook-service';

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.adminAction.create.mockResolvedValue({ id: 'act-1' });
  mockPrisma.followUpReminder.create.mockResolvedValue({ id: 'fr-1' });
  mockPrisma.webhookLog.create.mockResolvedValue({ id: 'wh-1' });
});

describe('Lead lifecycle flow', () => {
  it('transitions new → contacted → proposal_sent with side effects', async () => {
    const lead = {
      id: 'l-1',
      status: LEAD_STATUS.NEW,
      email: 'lead@acme.com',
      company: 'Acme',
      sourceSessionId: 'sess-1',
    };
    mockPrisma.enterpriseLead.findUnique.mockResolvedValue(lead);
    mockPrisma.enterpriseLead.update.mockResolvedValue({ ...lead, status: LEAD_STATUS.CONTACTED });

    const r1 = await updateLeadStatus('l-1', LEAD_STATUS.CONTACTED, 'admin-1');
    expect(r1.success).toBe(true);
    expect(mockPrisma.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: ADMIN_ACTION_TYPE.LEAD_STATUS_CHANGED }),
      }),
    );

    const contactedLead = { ...lead, status: LEAD_STATUS.CONTACTED };
    mockPrisma.enterpriseLead.findUnique.mockResolvedValue(contactedLead);
    mockPrisma.enterpriseLead.update.mockResolvedValue({
      ...contactedLead,
      status: LEAD_STATUS.PROPOSAL_SENT,
    });
    mockPrisma.auditSession.update.mockResolvedValue({});

    const r2 = await updateLeadStatus('l-1', LEAD_STATUS.PROPOSAL_SENT, 'admin-1');
    expect(r2.success).toBe(true);
    expect(mockPrisma.followUpReminder.create).toHaveBeenCalled();
    // Payment unlock must NOT happen on CRM transition — it's a separate action.
    expect(mockPrisma.auditSession.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: { paid: true } }),
    );
  });

  it('rejects invalid transition new → proposal_sent', async () => {
    const lead = { id: 'l-1', status: LEAD_STATUS.NEW, email: 'lead@acme.com' };
    mockPrisma.enterpriseLead.findUnique.mockResolvedValue(lead);

    const result = await updateLeadStatus('l-1', LEAD_STATUS.PROPOSAL_SENT, 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe(ADMIN_ERR.INVALID_STATUS_TRANSITION);
  });
});

describe('Session force-close flow', () => {
  it('marks session abandoned and creates audit trail', async () => {
    mockPrisma.auditSession.findUnique.mockResolvedValue({ id: 's-1', status: 'in_progress' });
    mockPrisma.auditSession.update.mockResolvedValue({});

    const result = await forceCloseSession('s-1', 'admin-1');
    expect(result.success).toBe(true);
    expect(mockPrisma.auditSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: SESSION_STATUS.ABANDONED },
      }),
    );
    expect(mockPrisma.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: ADMIN_ACTION_TYPE.SESSION_KILLED }),
      }),
    );
  });

  it('rejects force-close on completed session', async () => {
    mockPrisma.auditSession.findUnique.mockResolvedValue({ id: 's-1', status: 'completed' });

    const result = await forceCloseSession('s-1', 'admin-1');
    expect(result.success).toBe(false);
  });
});

describe('Threat intel deletion protection', () => {
  it('blocks deletion of article used in reports', async () => {
    mockPrisma.threatIntel.findUnique.mockResolvedValue({
      id: 'ti-1',
      softDeleted: false,
      usedInReports: true,
    });

    const result = await deleteArticle('ti-1', 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe(ADMIN_ERR.THREAT_INTEL_PROTECTED);
  });

  it('allows deletion of unused article and logs action', async () => {
    mockPrisma.threatIntel.findUnique.mockResolvedValue({
      id: 'ti-2',
      softDeleted: false,
      usedInReports: false,
    });
    mockPrisma.threatIntel.update.mockResolvedValue({});

    const result = await deleteArticle('ti-2', 'admin-1');
    expect(result.success).toBe(true);
    expect(mockPrisma.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: ADMIN_ACTION_TYPE.THREAT_INTEL_DELETED }),
      }),
    );
  });
});

describe('Audit log querying', () => {
  it('returns actions with admin email resolved from user table', async () => {
    mockPrisma.adminAction.findMany.mockResolvedValue([
      {
        id: 'act-1',
        adminId: 'adm-1',
        actionType: 'session_killed',
        entityType: 'session',
        entityId: 's-1',
        metadata: null,
        createdAt: new Date(),
      },
    ]);
    mockPrisma.adminAction.count.mockResolvedValue(1);
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'adm-1', email: 'admin@raivan.com' }]);

    const result = await getAuditLog();
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].adminEmail).toBe('admin@raivan.com');
  });
});

describe('Webhook logging', () => {
  it('logs successful webhook', async () => {
    await logWebhookSuccess('razorpay', 'payment.captured');
    expect(mockPrisma.webhookLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'success' }),
      }),
    );
  });

  it('logs failed webhook with sanitized error', async () => {
    await logWebhookFailure('razorpay', 'payment.failed', 'Error for user@test.com');
    const callData = mockPrisma.webhookLog.create.mock.calls[0][0].data;
    expect(callData.status).toBe('failed');
    expect(callData.errorLog).not.toContain('user@test.com');
  });
});
