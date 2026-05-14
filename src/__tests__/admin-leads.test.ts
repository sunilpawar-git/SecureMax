/**
 * Tests for enterprise leads service — status transitions, side effects, queries.
 */

import { getLeads, updateLeadStatus, sendEmailToLead } from '@/lib/admin/leads-service';
import { LEAD_STATUS, ADMIN_ACTION_TYPE, ADMIN_ENTITY_TYPE } from '@/config/admin-strings';

const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockCreate = jest.fn();
const mockSessionUpdate = jest.fn();
const mockAdminActionCreate = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    enterpriseLead: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      count: (...a: unknown[]) => mockCount(...a),
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
    followUpReminder: { create: (...a: unknown[]) => mockCreate(...a) },
    auditSession: { update: (...a: unknown[]) => mockSessionUpdate(...a) },
    adminAction: { create: (...a: unknown[]) => mockAdminActionCreate(...a) },
  },
}));

const mockSendLeadEmail = jest.fn();
jest.mock('@/lib/admin/email', () => ({
  sendLeadEmail: (...a: unknown[]) => mockSendLeadEmail(...a),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAdminActionCreate.mockResolvedValue({ id: 'action-1' });
});

describe('getLeads', () => {
  it('returns leads with pagination', async () => {
    mockFindMany.mockResolvedValue([{ id: 'lead-1' }]);
    mockCount.mockResolvedValue(1);

    const result = await getLeads({ page: 1, limit: 10 });

    expect(result.leads).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it('filters by status', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getLeads({ status: 'new' });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'new' }),
      }),
    );
  });

  it('filters by search across company and name', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await getLeads({ search: 'acme' });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ company: expect.objectContaining({ contains: 'acme' }) }),
          ]),
        }),
      }),
    );
  });

  it('returns empty array on no results', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const result = await getLeads();
    expect(result.leads).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe('updateLeadStatus', () => {
  const baseLead = {
    id: 'lead-1',
    status: LEAD_STATUS.NEW,
    email: 'test@example.com',
    sourceSessionId: 'sess-1',
  };

  it('allows valid transition new -> contacted', async () => {
    mockFindUnique.mockResolvedValue(baseLead);
    mockUpdate.mockResolvedValue({ ...baseLead, status: LEAD_STATUS.CONTACTED });

    const result = await updateLeadStatus('lead-1', LEAD_STATUS.CONTACTED, 'admin-1');

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('rejects invalid transition new -> closed_won', async () => {
    mockFindUnique.mockResolvedValue(baseLead);

    const result = await updateLeadStatus('lead-1', LEAD_STATUS.CLOSED_WON, 'admin-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid status transition');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns error for non-existent lead', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await updateLeadStatus('bad-id', LEAD_STATUS.CONTACTED, 'admin-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Lead not found');
  });

  it('creates follow-up reminder on proposal_sent', async () => {
    const contactedLead = { ...baseLead, status: LEAD_STATUS.CONTACTED };
    mockFindUnique.mockResolvedValue(contactedLead);
    mockUpdate.mockResolvedValue({ ...contactedLead, status: LEAD_STATUS.PROPOSAL_SENT });
    mockSendLeadEmail.mockResolvedValue({ success: true });

    await updateLeadStatus('lead-1', LEAD_STATUS.PROPOSAL_SENT, 'admin-1');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadId: 'lead-1',
          status: 'pending',
          dueAt: expect.any(Date),
        }),
      }),
    );
  });

  it('unlocks session report on proposal_sent', async () => {
    const contactedLead = { ...baseLead, status: LEAD_STATUS.CONTACTED };
    mockFindUnique.mockResolvedValue(contactedLead);
    mockUpdate.mockResolvedValue({ ...contactedLead, status: LEAD_STATUS.PROPOSAL_SENT });
    mockSendLeadEmail.mockResolvedValue({ success: true });

    await updateLeadStatus('lead-1', LEAD_STATUS.PROPOSAL_SENT, 'admin-1');

    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sess-1' },
        data: { paid: true },
      }),
    );
  });

  it('sends email on proposal_sent if lead has email', async () => {
    const contactedLead = { ...baseLead, status: LEAD_STATUS.CONTACTED };
    mockFindUnique.mockResolvedValue(contactedLead);
    mockUpdate.mockResolvedValue({ ...contactedLead, status: LEAD_STATUS.PROPOSAL_SENT });
    mockSendLeadEmail.mockResolvedValue({ success: true });

    await updateLeadStatus('lead-1', LEAD_STATUS.PROPOSAL_SENT, 'admin-1');

    expect(mockSendLeadEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'test@example.com' }),
    );
  });

  it('logs admin action on successful transition', async () => {
    mockFindUnique.mockResolvedValue(baseLead);
    mockUpdate.mockResolvedValue({ ...baseLead, status: LEAD_STATUS.CONTACTED });

    await updateLeadStatus('lead-1', LEAD_STATUS.CONTACTED, 'admin-1');

    expect(mockAdminActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminId: 'admin-1',
          actionType: ADMIN_ACTION_TYPE.LEAD_STATUS_CHANGED,
          entityType: ADMIN_ENTITY_TYPE.LEAD,
          entityId: 'lead-1',
        }),
      }),
    );
  });

  it('allows re-opening a closed_lost lead', async () => {
    const closedLead = { ...baseLead, status: LEAD_STATUS.CLOSED_LOST };
    mockFindUnique.mockResolvedValue(closedLead);
    mockUpdate.mockResolvedValue({ ...closedLead, status: LEAD_STATUS.NEW });

    const result = await updateLeadStatus('lead-1', LEAD_STATUS.NEW, 'admin-1');
    expect(result.success).toBe(true);
  });
});

describe('sendEmailToLead', () => {
  it('sends email and logs action', async () => {
    mockFindUnique.mockResolvedValue({ id: 'lead-1', email: 'test@co.com' });
    mockSendLeadEmail.mockResolvedValue({ success: true, messageId: 'msg-1' });
    mockUpdate.mockResolvedValue({});

    const result = await sendEmailToLead('lead-1', 'Subject', 'Body', 'admin-1');

    expect(result.success).toBe(true);
    expect(mockSendLeadEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'test@co.com', subject: 'Subject' }),
    );
    expect(mockAdminActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: ADMIN_ACTION_TYPE.EMAIL_SENT,
        }),
      }),
    );
  });

  it('returns error for non-existent lead', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await sendEmailToLead('bad-id', 'Sub', 'Body', 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Lead not found');
  });

  it('returns error if lead has no email', async () => {
    mockFindUnique.mockResolvedValue({ id: 'lead-1', email: null });

    const result = await sendEmailToLead('lead-1', 'Sub', 'Body', 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Lead has no email address');
  });

  it('returns error if email send fails', async () => {
    mockFindUnique.mockResolvedValue({ id: 'lead-1', email: 'test@co.com' });
    mockSendLeadEmail.mockResolvedValue({ success: false, error: 'Send failed' });

    const result = await sendEmailToLead('lead-1', 'Sub', 'Body', 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Send failed');
  });
});
