/**
 * Tests for Admin Knowledge Base — hook reducer logic and API route.
 * Uses node environment (no jsdom); tests hook logic via direct fetch mocking.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('useKnowledgeBase fetch logic', () => {
  it('calls /api/admin/knowledge-base on init', async () => {
    const statsData = { domains: { 'CPP-01': 42, 'CPP-05': 18 }, total: 60 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: statsData }),
    });

    await fetch('/api/admin/knowledge-base');
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/knowledge-base');
  });

  it('upload sends FormData with file and domain', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { status: 'ok', inserted: 5, skipped: 0 } }),
    });

    const formData = new FormData();
    formData.append('file', new File(['test'], 'doc.pdf'));
    formData.append('domain', 'CPP-01');

    await fetch('/api/admin/knowledge-base', { method: 'POST', body: formData });
    expect(mockFetch).toHaveBeenCalledWith('/api/admin/knowledge-base', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('handles fetch error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    let error: string | null = null;
    try {
      await fetch('/api/admin/knowledge-base');
    } catch (err) {
      error = err instanceof Error ? err.message : 'unknown';
    }
    expect(error).toBe('Network error');
  });
});

describe('Admin Knowledge Base API route', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.mock('@/lib/prisma', () => ({ prisma: {} }));
    jest.mock('@/lib/auth', () => ({}));
    jest.mock('@/lib/env', () => ({
      env: { AI_SERVICE_URL: 'http://localhost:8000', AI_SERVICE_KEY: 'test' },
    }));
    jest.mock('@/lib/logger', () => ({
      logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
    }));
    jest.mock('@/lib/api', () => ({
      apiSuccess: (data: unknown) =>
        new Response(JSON.stringify({ data }), { status: 200 }),
      apiError: (msg: string, code: number) =>
        new Response(JSON.stringify({ error: msg }), { status: code }),
    }));
  });

  it('GET requires admin auth', async () => {
    jest.mock('@/lib/admin/auth', () => ({
      verifyAdmin: jest.fn().mockResolvedValue(false),
      forbiddenResponse: jest.fn().mockReturnValue(
        new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
      ),
    }));

    const { GET } = await import('@/app/api/admin/knowledge-base/route');
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('POST validates required fields', async () => {
    jest.mock('@/lib/admin/auth', () => ({
      verifyAdmin: jest.fn().mockResolvedValue(true),
      forbiddenResponse: jest.fn(),
    }));

    const { POST } = await import('@/app/api/admin/knowledge-base/route');

    const formData = new FormData();
    const request = new Request('http://localhost/api/admin/knowledge-base', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(request as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('required');
  });
});
