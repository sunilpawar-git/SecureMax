/**
 * Tests for /api/report Next.js route — checklist action, mode forwarding,
 * and input validation.
 *
 * Tests operate in the node environment (no jsdom).
 * All external dependencies (auth, aiServiceFetch, env) are mocked.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// --- Module mocks (must be hoisted before imports) ---

jest.mock('@/lib/api', () => ({
  requireAuth: jest.fn(),
  unauthorizedResponse: jest.fn(() => new Response(null, { status: 401 })),
  apiSuccess: jest.fn((data: unknown) => new Response(JSON.stringify(data), { status: 200 })),
  apiError: jest.fn(
    (msg: string, code = 400) => new Response(JSON.stringify({ error: msg }), { status: code }),
  ),
  validateCuid: jest.fn((id: string) => /^[a-z0-9]{20,}$/i.test(id)),
}));

jest.mock('@/lib/ai-service', () => ({
  aiServiceFetch: jest.fn(),
  AIServiceError: class AIServiceError extends Error {
    constructor(
      public message: string,
      public statusCode: number,
    ) {
      super(message);
    }
  },
}));

jest.mock('@/lib/env', () => ({
  env: { AI_SERVICE_URL: 'http://localhost:8000', AI_SERVICE_KEY: 'test-key' },
}));

jest.mock('@/components/report/FindingCard', () => ({
  REDACTED_PLACEHOLDER: '[REDACTED]',
}));

// --- Imports after mocks ---

import type { NextRequest } from 'next/server';
import { requireAuth, apiError, validateCuid } from '@/lib/api';
import { aiServiceFetch } from '@/lib/ai-service';

const mockRequireAuth = requireAuth as jest.Mock;
const mockAiServiceFetch = aiServiceFetch as jest.Mock;
const mockValidateCuid = validateCuid as jest.Mock;
const mockApiError = apiError as jest.Mock;

const MOCK_SESSION = { user: { id: 'user_cuid_test_12345678' } };
const VALID_REPORT_ID = 'clxxxxxxxxxxxxxxxxxxxxxx';

function makeRequest(action: string, extraParams: Record<string, string> = {}): NextRequest {
  const url = new URL(`http://localhost/api/report`);
  url.searchParams.set('action', action);
  url.searchParams.set('report_id', VALID_REPORT_ID);
  for (const [k, v] of Object.entries(extraParams)) {
    url.searchParams.set(k, v);
  }
  // Minimal NextRequest mock — only the properties consumed by the route handler.
  return { nextUrl: url } as unknown as NextRequest;
}

describe('/api/report GET — checklist action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue(MOCK_SESSION);
    mockValidateCuid.mockReturnValue(true);
    mockAiServiceFetch.mockResolvedValue({ items: [], total: 0, session_id: 'sess_123' });
  });

  it('proxies checklist action to FastAPI /report/{id}/checklist', async () => {
    const { GET } = await import('../app/api/report/route');
    await GET(makeRequest('checklist'));

    expect(mockAiServiceFetch).toHaveBeenCalledWith(
      `/report/${VALID_REPORT_ID}/checklist`,
      expect.objectContaining({ method: 'GET', userId: MOCK_SESSION.user.id }),
    );
  });

  it('returns 401 when unauthenticated', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const { GET } = await import('../app/api/report/route');
    const res = await GET(makeRequest('checklist'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when report_id is missing', async () => {
    const { GET } = await import('../app/api/report/route');
    const url = new URL('http://localhost/api/report');
    url.searchParams.set('action', 'checklist');
    await GET({ nextUrl: url } as unknown as NextRequest);
    expect(mockApiError).toHaveBeenCalledWith('report_id required');
  });

  it('returns 400 when report_id is invalid format', async () => {
    mockValidateCuid.mockReturnValue(false);
    const { GET } = await import('../app/api/report/route');
    await GET(makeRequest('checklist'));
    expect(mockApiError).toHaveBeenCalledWith('Invalid report_id format', 400);
  });
});

describe('/api/report GET — mode parameter forwarding', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue(MOCK_SESSION);
    mockValidateCuid.mockReturnValue(true);
    global.fetch = mockFetch as any;
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
      headers: new Headers({ 'Content-Type': 'application/pdf' }),
    });
  });

  it('appends ?mode=executive to FastAPI URL when mode=executive', async () => {
    const { GET } = await import('../app/api/report/route');
    await GET(makeRequest('full', { mode: 'executive' }));

    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('?mode=executive');
  });

  it('appends ?mode=technical to FastAPI URL when mode=technical', async () => {
    const { GET } = await import('../app/api/report/route');
    await GET(makeRequest('full', { mode: 'technical' }));

    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('?mode=technical');
  });

  it('does NOT append mode param when mode=complete (default)', async () => {
    const { GET } = await import('../app/api/report/route');
    await GET(makeRequest('full'));

    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).not.toContain('mode=');
  });
});

describe('/api/report GET — invalid actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue(MOCK_SESSION);
    mockValidateCuid.mockReturnValue(true);
  });

  it('returns error for unknown action', async () => {
    const { GET } = await import('../app/api/report/route');
    await GET(makeRequest('nonexistent'));
    expect(mockApiError).toHaveBeenCalledWith(expect.stringContaining('Invalid action'));
  });
});
