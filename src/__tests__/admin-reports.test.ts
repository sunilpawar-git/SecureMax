/**
 * Tests for admin reports service — list, regen concurrency guard, unlock.
 */

import {
  getReports,
  regenerateReport,
  unlockReport,
  getReportDiff,
} from '@/lib/admin/reports-service';
import { REPORT_JOB_STATUS, ADMIN_ACTION_TYPE, ADMIN_ERR } from '@/config/admin-strings';

const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockAdminCreate = jest.fn();
const mockJobFindUnique = jest.fn();
const mockSessionFindUnique = jest.fn();
const mockSessionUpdate = jest.fn();
const mockArtifactFindUnique = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    reportArtifact: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      findUnique: (...a: unknown[]) => mockArtifactFindUnique(...a),
    },
    reportJob: { findUnique: (...a: unknown[]) => mockJobFindUnique(...a) },
    auditSession: {
      findUnique: (...a: unknown[]) => mockSessionFindUnique(...a),
      update: (...a: unknown[]) => mockSessionUpdate(...a),
    },
    adminAction: { create: (...a: unknown[]) => mockAdminCreate(...a) },
  },
}));

const mockAiServiceFetch = jest.fn();
jest.mock('@/lib/ai-service', () => ({
  aiServiceFetch: (...a: unknown[]) => mockAiServiceFetch(...a),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAdminCreate.mockResolvedValue({ id: 'action-1' });
});

describe('getReports', () => {
  it('returns mapped report data', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'rpt-1',
        sessionId: 'sess-1',
        version: 1,
        auditUrgencyScore: 80,
        complianceGapCount: 3,
        generatedAt: new Date('2026-05-01'),
        session: {
          id: 'sess-1',
          track: 'hni',
          status: 'completed',
          paid: true,
          enterpriseReportUnlocked: false,
          user: { email: 'user@test.com' },
        },
      },
    ]);

    const reports = await getReports();
    expect(reports).toHaveLength(1);
    expect(reports[0].sessionId).toBe('sess-1');
    expect(reports[0].track).toBe('hni');
    expect(reports[0].userEmail).toBe('user@test.com');
    expect(reports[0].version).toBe(1);
  });

  it('returns empty array when no reports exist', async () => {
    mockFindMany.mockResolvedValue([]);
    const reports = await getReports();
    expect(reports).toEqual([]);
  });
});

describe('regenerateReport', () => {
  it('blocks when job is pending', async () => {
    mockJobFindUnique.mockResolvedValue({ status: REPORT_JOB_STATUS.PENDING });

    const result = await regenerateReport('sess-1', 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe(ADMIN_ERR.REPORT_REGEN_IN_PROGRESS);
  });

  it('blocks when job is processing', async () => {
    mockJobFindUnique.mockResolvedValue({ status: REPORT_JOB_STATUS.PROCESSING });

    const result = await regenerateReport('sess-1', 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe(ADMIN_ERR.REPORT_REGEN_IN_PROGRESS);
  });

  it('returns error for non-existent session', async () => {
    mockJobFindUnique.mockResolvedValue(null);
    mockSessionFindUnique.mockResolvedValue(null);

    const result = await regenerateReport('bad-id', 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe(ADMIN_ERR.SESSION_NOT_FOUND);
  });

  it('calls FastAPI and logs action on success', async () => {
    mockJobFindUnique.mockResolvedValue(null);
    mockSessionFindUnique.mockResolvedValue({ id: 'sess-1' });
    mockAiServiceFetch.mockResolvedValue({ report_id: 'job-1' });

    const result = await regenerateReport('sess-1', 'admin-1');
    expect(result.success).toBe(true);
    expect(result.jobId).toBe('job-1');
    expect(mockAiServiceFetch).toHaveBeenCalledWith(
      '/report/admin-regenerate',
      expect.objectContaining({ body: { session_id: 'sess-1' } }),
    );
    expect(mockAdminCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: ADMIN_ACTION_TYPE.REPORT_REGENERATED,
          entityId: 'sess-1',
        }),
      }),
    );
  });

  it('allows regen when previous job is completed', async () => {
    mockJobFindUnique.mockResolvedValue({ status: REPORT_JOB_STATUS.COMPLETED });
    mockSessionFindUnique.mockResolvedValue({ id: 'sess-1' });
    mockAiServiceFetch.mockResolvedValue({ report_id: 'job-2' });

    const result = await regenerateReport('sess-1', 'admin-1');
    expect(result.success).toBe(true);
  });

  it('allows regen when previous job failed', async () => {
    mockJobFindUnique.mockResolvedValue({ status: REPORT_JOB_STATUS.FAILED });
    mockSessionFindUnique.mockResolvedValue({ id: 'sess-1' });
    mockAiServiceFetch.mockResolvedValue({ report_id: 'job-3' });

    const result = await regenerateReport('sess-1', 'admin-1');
    expect(result.success).toBe(true);
  });
});

describe('unlockReport', () => {
  it('unlocks session and logs action', async () => {
    mockSessionFindUnique.mockResolvedValue({ id: 'sess-1' });
    mockSessionUpdate.mockResolvedValue({});

    const result = await unlockReport('sess-1', 'admin-1');
    expect(result.success).toBe(true);
    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sess-1' },
        data: { enterpriseReportUnlocked: true },
      }),
    );
    expect(mockAdminCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: ADMIN_ACTION_TYPE.REPORT_UNLOCKED,
        }),
      }),
    );
  });

  it('returns error for non-existent session', async () => {
    mockSessionFindUnique.mockResolvedValue(null);

    const result = await unlockReport('bad-id', 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe(ADMIN_ERR.SESSION_NOT_FOUND);
  });
});

describe('getReportDiff', () => {
  it('returns null when no previous version exists', async () => {
    mockArtifactFindUnique.mockResolvedValue({ previousId: null, findingsJson: {} });

    const diff = await getReportDiff('sess-1');
    expect(diff).toBeNull();
  });

  it('returns diff when previous version exists', async () => {
    mockArtifactFindUnique
      .mockResolvedValueOnce({
        previousId: 'prev-1',
        findingsJson: {
          findings: [
            { domain: 'CPP-01', title: 'A' },
            { domain: 'CPP-02', title: 'B' },
          ],
          urgency_score: 80,
        },
      })
      .mockResolvedValueOnce({
        findingsJson: {
          findings: [{ domain: 'CPP-01', title: 'A' }],
          urgency_score: 60,
        },
      });

    const diff = await getReportDiff('sess-1');
    expect(diff).not.toBeNull();
    expect(diff!.addedFindings).toHaveLength(1);
    expect(diff!.urgencyDelta).toBe(20);
  });
});
