/**
 * Phase 2 tests — /api/admin/health route.
 * Intent: the route reports actionable config state (AI service reachable,
 * service key accepted, LinkedIn configured) as booleans ONLY — no URLs,
 * no key fragments — and is admin-gated. LinkedIn check uses vault-first
 * getSecret (same path publishers use).
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

const mockGetSecret = jest.fn();
jest.mock('@/lib/secrets', () => ({
  getSecret: (p: string) => mockGetSecret(p),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

import { GET } from '@/app/api/admin/health/route';
import { AIServiceError } from '@/lib/ai-service';

const ADMIN_SESSION = { user: { id: 'admin-1' } };

beforeEach(() => {
  jest.clearAllMocks();
  mockVerifyAdmin.mockResolvedValue(ADMIN_SESSION);
  mockAiFetch.mockResolvedValue({ status: 'healthy' });
  mockGetSecret.mockResolvedValue('');
});

describe('GET /api/admin/health', () => {
  it('returns 403 for non-admins', async () => {
    mockVerifyAdmin.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('reports healthy state when AI service responds and LinkedIn keys in vault', async () => {
    mockGetSecret.mockImplementation((p: string) => {
      if (p === 'linkedin') return Promise.resolve('real-token-value');
      if (p === 'linkedin_org_id') return Promise.resolve('12345');
      return Promise.resolve('');
    });
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({
      aiServiceReachable: true,
      aiServiceAuthOk: true,
      linkedinConfigured: true,
    });
  });

  it('reports unreachable when the health ping fails', async () => {
    mockAiFetch.mockRejectedValue(new Error('fetch failed'));
    const res = await GET();
    const body = await res.json();
    expect(body.aiServiceReachable).toBe(false);
    expect(body.aiServiceAuthOk).toBe(false);
  });

  it('reports auth failure when the authed ping returns 401', async () => {
    mockAiFetch
      .mockResolvedValueOnce({ status: 'healthy' }) // public /health
      .mockRejectedValueOnce(new AIServiceError('unauthorized', 401)); // authed ping
    const res = await GET();
    const body = await res.json();
    expect(body.aiServiceReachable).toBe(true);
    expect(body.aiServiceAuthOk).toBe(false);
  });

  it('reports unconfigured when vault returns empty for LinkedIn', async () => {
    mockGetSecret.mockResolvedValue('');
    const res = await GET();
    const body = await res.json();
    expect(body.linkedinConfigured).toBe(false);
  });

  it('never returns anything except the three booleans', async () => {
    const res = await GET();
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual([
      'aiServiceAuthOk',
      'aiServiceReachable',
      'linkedinConfigured',
    ]);
    expect(Object.values(body).every((v) => typeof v === 'boolean')).toBe(true);
  });
});
