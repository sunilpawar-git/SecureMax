/**
 * Phase 7 tests — /api/admin/newsletter route.
 * Intent: list never ships image bytes (previews go through the image
 * route); generate proxies to FastAPI and logs the admin action; delete is
 * a soft-delete (status flip — Rule 15: rows are never destroyed); every
 * verb is admin-gated.
 */

const mockVerifyAdmin = jest.fn();
jest.mock('@/lib/admin/auth', () => ({
  verifyAdmin: (...a: unknown[]) => mockVerifyAdmin(...a),
  forbiddenResponse: () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
}));

const mockAiFetch = jest.fn();
jest.mock('@/lib/ai-service', () => ({
  aiServiceFetch: (...a: unknown[]) => mockAiFetch(...a),
  AIServiceError: class AIServiceError extends Error {
    constructor(
      message: string,
      public statusCode: number,
    ) {
      super(message);
    }
  },
}));

const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockActionCreate = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    newsletter: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
    adminAction: { create: (...a: unknown[]) => mockActionCreate(...a) },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/admin/newsletter/route';
import { AIServiceError } from '@/lib/ai-service';

const ADMIN_SESSION = { user: { id: 'admin-1' } };

beforeEach(() => {
  jest.clearAllMocks();
  mockVerifyAdmin.mockResolvedValue(ADMIN_SESSION);
  mockAiFetch.mockResolvedValue({ newsletter_id: 'nl-1', title: 'Digest' });
  mockFindUnique.mockResolvedValue({ id: 'nl-1' });
  mockFindMany.mockResolvedValue([
    {
      id: 'nl-1',
      title: 'Digest',
      status: 'draft',
      articleIds: ['ti-1', 'ti-2'],
      createdAt: new Date('2026-06-08'),
      posts: [],
    },
  ]);
  mockUpdate.mockResolvedValue({ id: 'nl-1' });
  mockActionCreate.mockResolvedValue({ id: 'act-1' });
});

function listReq(): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/newsletter');
}

function statusReq(jobId: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/admin/newsletter?action=status&jobId=${encodeURIComponent(jobId)}`,
  );
}

describe('GET /api/admin/newsletter', () => {
  it('lists newsletters without image bytes', async () => {
    const res = await GET(listReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.newsletters).toHaveLength(1);
    expect(body.newsletters[0]).not.toHaveProperty('imagePng');
    // select must exclude the bytes column entirely
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.select?.imagePng).toBeUndefined();
  });

  it('returns 403 for non-admins', async () => {
    mockVerifyAdmin.mockResolvedValue(null);
    const res = await GET(listReq());
    expect(res.status).toBe(403);
  });

  it('proxies job status polls to FastAPI', async () => {
    mockAiFetch.mockResolvedValue({
      job_id: 'job-1',
      status: 'completed',
      newsletter_id: 'nl-1',
      title: 'Digest',
    });
    const res = await GET(statusReq('job-1'));
    expect(res.status).toBe(200);
    expect(mockAiFetch).toHaveBeenCalledWith('/newsletter/jobs/job-1', { method: 'GET' });
    const body = await res.json();
    expect(body.status).toBe('completed');
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});

describe('POST ?action=generate', () => {
  function genReq(): NextRequest {
    return new NextRequest('http://localhost:3000/api/admin/newsletter?action=generate', {
      method: 'POST',
    });
  }

  it('proxies async draft enqueue and logs job id', async () => {
    mockAiFetch.mockResolvedValue({ job_id: 'job-1', status: 'pending' });
    const res = await POST(genReq());
    expect(res.status).toBe(200);
    expect(mockAiFetch).toHaveBeenCalledWith(
      '/newsletter/draft',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: 'newsletter_generated',
          entityType: 'newsletter',
          entityId: 'job-1',
        }),
      }),
    );
  });

  it('passes the upstream 422 (no articles) through to the client', async () => {
    mockAiFetch.mockRejectedValue(new AIServiceError('No threat intel articles', 422));
    const res = await POST(genReq());
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain('No threat intel articles');
  });

  it('returns 403 for non-admins', async () => {
    mockVerifyAdmin.mockResolvedValue(null);
    const res = await POST(genReq());
    expect(res.status).toBe(403);
    expect(mockAiFetch).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/admin/newsletter?id=', () => {
  function delReq(id?: string): NextRequest {
    const url = new URL('http://localhost:3000/api/admin/newsletter');
    if (id) url.searchParams.set('id', id);
    return new NextRequest(url, { method: 'DELETE' });
  }

  it('soft-deletes (status flip, never a row delete) and logs the action', async () => {
    const res = await DELETE(delReq('nl-1'));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'nl-1' },
        data: expect.objectContaining({ status: 'deleted' }),
      }),
    );
    expect(mockActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: 'newsletter_deleted' }),
      }),
    );
  });

  it('400s without an id', async () => {
    const res = await DELETE(delReq());
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 403 for non-admins', async () => {
    mockVerifyAdmin.mockResolvedValue(null);
    const res = await DELETE(delReq('nl-1'));
    expect(res.status).toBe(403);
  });
});
