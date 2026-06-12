/**
 * Phase 6 tests — LinkedIn direct posting service.
 * Intent: publish must call the versioned Posts API (never legacy ugcPosts)
 * with the company-page URN, honour the 10s timeout, and translate every
 * failure mode into { success: false } without throwing.
 */

// Phase 4: the service resolves credentials vault-first via getSecret().
// Map providers back to process.env so the existing scenarios keep driving
// the same configured/unconfigured states.
const mockGetSecret = jest.fn((provider: string) =>
  Promise.resolve(
    provider === 'linkedin'
      ? (process.env.LINKEDIN_ACCESS_TOKEN ?? '')
      : (process.env.LINKEDIN_ORG_ID ?? ''),
  ),
);
jest.mock('@/lib/secrets', () => ({
  getSecret: (p: string) => mockGetSecret(p),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

import { publishToLinkedIn, buildPostPayload } from '@/lib/admin/linkedin-post-service';

const mockFetch = jest.fn();
const realFetch = global.fetch;

function okResponse(postUrn: string | null = 'urn:li:share:12345') {
  return {
    ok: true,
    status: 201,
    headers: new Headers(postUrn ? { 'x-restli-id': postUrn } : {}),
    text: async () => '',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.LINKEDIN_ACCESS_TOKEN = 'test-token';
  process.env.LINKEDIN_ORG_ID = '987654';
  global.fetch = mockFetch as unknown as typeof fetch;
  mockFetch.mockResolvedValue(okResponse());
});

afterAll(() => {
  global.fetch = realFetch;
  delete process.env.LINKEDIN_ACCESS_TOKEN;
  delete process.env.LINKEDIN_ORG_ID;
});

describe('vault-first credential resolution', () => {
  it('reads the token and org id through getSecret providers', async () => {
    await publishToLinkedIn('Hello');
    expect(mockGetSecret).toHaveBeenCalledWith('linkedin');
    expect(mockGetSecret).toHaveBeenCalledWith('linkedin_org_id');
  });
});

describe('buildPostPayload', () => {
  it('targets the organization URN with PUBLISHED lifecycle', () => {
    const payload = buildPostPayload('Hello world', '987654');
    expect(payload.author).toBe('urn:li:organization:987654');
    expect(payload.commentary).toBe('Hello world');
    expect(payload.lifecycleState).toBe('PUBLISHED');
    expect(payload.visibility).toBe('PUBLIC');
  });
});

describe('publishToLinkedIn', () => {
  it('calls the versioned Posts API (not legacy ugcPosts) with required headers', async () => {
    const result = await publishToLinkedIn('Security briefing of the week');

    expect(result).toEqual({ success: true, linkedinPostId: 'urn:li:share:12345' });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.linkedin.com/rest/posts');
    expect(url).not.toContain('ugcPosts');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(init.headers['LinkedIn-Version']).toMatch(/^\d{6}$/);
    expect(init.headers['X-Restli-Protocol-Version']).toBe('2.0.0');

    const body = JSON.parse(init.body);
    expect(body.author).toBe('urn:li:organization:987654');
    expect(body.commentary).toBe('Security briefing of the week');
  });

  it('succeeds without a post id when x-restli-id header is absent', async () => {
    mockFetch.mockResolvedValue(okResponse(null));
    const result = await publishToLinkedIn('text');
    expect(result.success).toBe(true);
    expect(result.linkedinPostId).toBeUndefined();
  });

  it('returns an error for non-200 responses without throwing', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
      text: async () => '{"message":"Invalid token"}',
    });
    const result = await publishToLinkedIn('text');
    expect(result.success).toBe(false);
    expect(result.error).toContain('401');
  });

  it('returns a timeout error when the request aborts', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValue(abortError);
    const result = await publishToLinkedIn('text');
    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');
  });

  it('returns a generic error on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNRESET'));
    const result = await publishToLinkedIn('text');
    expect(result.success).toBe(false);
    expect(result.error).toBe('LinkedIn request failed');
  });

  it('fails fast when credentials are not configured (no API call)', async () => {
    process.env.LINKEDIN_ACCESS_TOKEN = '';
    const result = await publishToLinkedIn('text');
    expect(result.success).toBe(false);
    expect(result.error).toBe('LinkedIn is not configured');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
