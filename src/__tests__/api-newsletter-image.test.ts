/**
 * Phase 5 tests — GET /api/newsletter/[id]/image (public).
 * Intent (security): the route serves the rendered PNG of published/draft
 * newsletters — only deleted issues are 404 (draft served because FB/IG
 * need the URL during publish before status flips).
 * Rate-limited to prevent abuse.
 */

const mockFindUnique = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: { newsletter: { findUnique: (...a: unknown[]) => mockFindUnique(...a) } },
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 29, resetMs: 60000 }),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/newsletter/[id]/image/route';

const PNG_BYTES = Buffer.from('fake-png-bytes');

function call(id = 'nl-1') {
  const req = new NextRequest(`http://localhost:3000/api/newsletter/${id}/image`);
  return GET(req, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFindUnique.mockResolvedValue({ id: 'nl-1', status: 'published', imagePng: PNG_BYTES });
});

describe('GET /api/newsletter/[id]/image', () => {
  it('serves the PNG with image headers for a published newsletter', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('Cache-Control')).toContain('public');
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.equals(PNG_BYTES)).toBe(true);
  });

  it('serves draft newsletters (needed by FB/IG during publish flow)', async () => {
    mockFindUnique.mockResolvedValue({ id: 'nl-1', status: 'draft', imagePng: PNG_BYTES });
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });

  it('returns 404 for a deleted newsletter', async () => {
    mockFindUnique.mockResolvedValue({ id: 'nl-1', status: 'deleted', imagePng: PNG_BYTES });
    const res = await call();
    expect(res.status).toBe(404);
  });

  it('returns 404 when the newsletter does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await call('nope');
    expect(res.status).toBe(404);
  });

  it('returns 404 when no image has been rendered yet', async () => {
    mockFindUnique.mockResolvedValue({ id: 'nl-1', status: 'published', imagePng: null });
    const res = await call();
    expect(res.status).toBe(404);
  });

  it('returns 429 when rate-limited', async () => {
    const { checkRateLimit } = jest.requireMock('@/lib/rate-limit');
    checkRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetMs: 30000 });
    const res = await call();
    expect(res.status).toBe(429);
  });
});
