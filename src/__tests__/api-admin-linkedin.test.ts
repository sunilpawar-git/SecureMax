/**
 * Phase 6 tests — /api/admin/linkedin route.
 * Intent: PATCH with action:"publish" must call the posting service and
 * persist status "posted" + postedAt; plain PATCH keeps the old status-update
 * behavior; DELETE soft-deletes (status "deleted", 204); non-admins get 403.
 */

const mockVerifyAdmin = jest.fn();
jest.mock('@/lib/admin/auth', () => ({
  verifyAdmin: (...a: unknown[]) => mockVerifyAdmin(...a),
  forbiddenResponse: () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
}));

const mockPublish = jest.fn();
jest.mock('@/lib/admin/linkedin-post-service', () => ({
  publishToLinkedIn: (...a: unknown[]) => mockPublish(...a),
}));

const mockPostUpdate = jest.fn();
const mockPostCreate = jest.fn();
const mockPostFindUnique = jest.fn();
const mockActionCreate = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    linkedinPost: {
      update: (...a: unknown[]) => mockPostUpdate(...a),
      create: (...a: unknown[]) => mockPostCreate(...a),
      findUnique: (...a: unknown[]) => mockPostFindUnique(...a),
      findMany: jest.fn(),
    },
    adminAction: { create: (...a: unknown[]) => mockActionCreate(...a) },
  },
}));

jest.mock('@/lib/ai-service', () => ({
  aiServiceFetch: jest.fn(),
  AIServiceError: class AIServiceError extends Error {
    statusCode = 500;
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

import { NextRequest } from 'next/server';
import { PATCH, DELETE } from '@/app/api/admin/linkedin/route';

const ADMIN_SESSION = { user: { id: 'admin-1' } };

function patchReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/linkedin', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function deleteReq(id?: string): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/linkedin');
  if (id) url.searchParams.set('id', id);
  return new NextRequest(url, { method: 'DELETE' });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockVerifyAdmin.mockResolvedValue(ADMIN_SESSION);
  mockPublish.mockResolvedValue({ success: true, linkedinPostId: 'urn:li:share:1' });
  mockPostFindUnique.mockResolvedValue({ id: 'post-1', status: 'draft' });
  mockPostUpdate.mockResolvedValue({ id: 'post-1' });
  mockPostCreate.mockResolvedValue({ id: 'post-new' });
  mockActionCreate.mockResolvedValue({ id: 'act-1' });
});

describe('PATCH action: publish', () => {
  it('publishes via the service and marks the existing draft posted', async () => {
    const res = await PATCH(patchReq({ action: 'publish', id: 'post-1', postText: 'Hello' }));
    expect(res.status).toBe(200);

    expect(mockPublish).toHaveBeenCalledWith('Hello');
    expect(mockPostUpdate).toHaveBeenCalledWith({
      where: { id: 'post-1' },
      data: expect.objectContaining({
        status: 'posted',
        finalText: 'Hello',
        postedAt: expect.any(Date),
        postedByAdmin: 'admin-1',
      }),
    });
    expect(mockActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: 'linkedin_post_published',
          entityType: 'linkedin_post',
        }),
      }),
    );
    const json = await res.json();
    expect(json).toEqual({ posted: true, linkedinPostId: 'urn:li:share:1' });
  });

  it('creates a new row when publishing ad-hoc text without an id', async () => {
    const res = await PATCH(patchReq({ action: 'publish', postText: 'Ad-hoc post' }));
    expect(res.status).toBe(200);
    expect(mockPostUpdate).not.toHaveBeenCalled();
    expect(mockPostCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'posted',
        draftText: 'Ad-hoc post',
        finalText: 'Ad-hoc post',
      }),
    });
  });

  it('returns 502 and does not touch the DB when LinkedIn rejects the post', async () => {
    mockPublish.mockResolvedValue({ success: false, error: 'LinkedIn API error (401)' });
    const res = await PATCH(patchReq({ action: 'publish', id: 'post-1', postText: 'Hello' }));
    expect(res.status).toBe(502);
    expect(mockPostUpdate).not.toHaveBeenCalled();
    expect(mockActionCreate).not.toHaveBeenCalled();
  });

  it('refuses to re-publish a draft that is already posted (double-post guard)', async () => {
    mockPostFindUnique.mockResolvedValue({ id: 'post-1', status: 'posted' });
    const res = await PATCH(patchReq({ action: 'publish', id: 'post-1', postText: 'Hello' }));
    expect(res.status).toBe(409);
    expect(mockPublish).not.toHaveBeenCalled();
    expect(mockPostUpdate).not.toHaveBeenCalled();
  });

  it('returns 404 when the referenced draft does not exist', async () => {
    mockPostFindUnique.mockResolvedValue(null);
    const res = await PATCH(patchReq({ action: 'publish', id: 'ghost', postText: 'Hello' }));
    expect(res.status).toBe(404);
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('flags bookkeepingFailed when the DB write fails after a live post', async () => {
    mockPostUpdate.mockRejectedValue(new Error('db down'));
    const res = await PATCH(patchReq({ action: 'publish', id: 'post-1', postText: 'Hello' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      posted: true,
      linkedinPostId: 'urn:li:share:1',
      bookkeepingFailed: true,
    });
    // Persistence was retried once before giving up
    expect(mockPostUpdate).toHaveBeenCalledTimes(2);
  });

  it('recovers when the DB write succeeds on the retry', async () => {
    mockPostUpdate
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({ id: 'post-1' });
    const res = await PATCH(patchReq({ action: 'publish', id: 'post-1', postText: 'Hello' }));
    const json = await res.json();
    expect(json).toEqual({ posted: true, linkedinPostId: 'urn:li:share:1' });
    expect(mockActionCreate).toHaveBeenCalled();
  });

  it('rejects an unknown action', async () => {
    const res = await PATCH(patchReq({ action: 'destroy', id: 'post-1', postText: 'x' }));
    expect(res.status).toBe(400);
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('keeps the legacy status-update behavior when no action field is sent', async () => {
    const res = await PATCH(patchReq({ id: 'post-1', status: 'published' }));
    expect(res.status).toBe(200);
    expect(mockPublish).not.toHaveBeenCalled();
    expect(mockPostUpdate).toHaveBeenCalledWith({
      where: { id: 'post-1' },
      data: { status: 'published' },
    });
  });

  it('returns 403 for non-admins', async () => {
    mockVerifyAdmin.mockResolvedValue(null);
    const res = await PATCH(patchReq({ action: 'publish', id: 'post-1', postText: 'x' }));
    expect(res.status).toBe(403);
    expect(mockPublish).not.toHaveBeenCalled();
  });
});

describe('DELETE — soft delete', () => {
  it('sets status to deleted, logs the action, and returns 204', async () => {
    const res = await DELETE(deleteReq('post-1'));
    expect(res.status).toBe(204);
    expect(mockPostUpdate).toHaveBeenCalledWith({
      where: { id: 'post-1' },
      data: { status: 'deleted' },
    });
    expect(mockActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: 'linkedin_post_deleted',
          entityId: 'post-1',
        }),
      }),
    );
  });

  it('returns 400 when id is missing', async () => {
    const res = await DELETE(deleteReq());
    expect(res.status).toBe(400);
    expect(mockPostUpdate).not.toHaveBeenCalled();
  });

  it('returns 403 for non-admins', async () => {
    mockVerifyAdmin.mockResolvedValue(null);
    const res = await DELETE(deleteReq('post-1'));
    expect(res.status).toBe(403);
  });
});
