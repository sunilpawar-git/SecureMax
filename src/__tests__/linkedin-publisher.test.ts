/**
 * Phase 8 tests — LinkedIn image publisher.
 * Intent: publishing an image follows the versioned 3-step flow
 * (initializeUpload → PUT bytes → create post with the image URN) on
 * api.linkedin.com/rest (NEVER legacy ugcPosts), resolves credentials via
 * getSecret, and translates every failure into { success: false }.
 */

const secrets: Record<string, string> = {};
jest.mock('@/lib/secrets', () => ({
  getSecret: (p: string) => Promise.resolve(secrets[p] ?? ''),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

import { linkedinPublisher } from '@/lib/social/linkedin-publisher';

const mockFetch = jest.fn();
const realFetch = global.fetch;

const INIT_OK = {
  ok: true,
  status: 200,
  json: async () => ({
    value: { uploadUrl: 'https://upload.linkedin.com/u/1', image: 'urn:li:image:abc' },
  }),
  text: async () => '',
};
const UPLOAD_OK = { ok: true, status: 201, text: async () => '' };
const POST_OK = {
  ok: true,
  status: 201,
  headers: new Headers({ 'x-restli-id': 'urn:li:share:777' }),
  text: async () => '',
};

const INPUT = {
  caption: 'Weekly digest',
  imagePng: Buffer.from('png'),
  imageUrl: 'https://app.example.com/api/newsletter/nl-1/image',
};

beforeEach(() => {
  jest.clearAllMocks();
  secrets.linkedin = 'token-123';
  secrets.linkedin_org_id = '987654';
  global.fetch = mockFetch as unknown as typeof fetch;
  mockFetch
    .mockResolvedValueOnce(INIT_OK)
    .mockResolvedValueOnce(UPLOAD_OK)
    .mockResolvedValueOnce(POST_OK);
});

afterAll(() => {
  global.fetch = realFetch;
});

describe('linkedinPublisher.publish', () => {
  it('runs initializeUpload → PUT bytes → post with the image URN', async () => {
    const result = await linkedinPublisher.publish(INPUT);

    expect(result.success).toBe(true);
    expect(result.externalId).toBe('urn:li:share:777');

    const [initUrl, initOpts] = mockFetch.mock.calls[0];
    expect(initUrl).toContain('api.linkedin.com/rest/images');
    expect(initUrl).toContain('action=initializeUpload');
    expect(JSON.parse(initOpts.body).initializeUploadRequest.owner).toBe(
      'urn:li:organization:987654',
    );

    const [uploadUrl, uploadOpts] = mockFetch.mock.calls[1];
    expect(uploadUrl).toBe('https://upload.linkedin.com/u/1');
    expect(uploadOpts.method).toBe('PUT');

    const [postUrl, postOpts] = mockFetch.mock.calls[2];
    expect(postUrl).toContain('api.linkedin.com/rest/posts');
    expect(postUrl).not.toContain('ugcPosts');
    const payload = JSON.parse(postOpts.body);
    expect(payload.content.media.id).toBe('urn:li:image:abc');
    expect(payload.commentary).toBe('Weekly digest');
  });

  it('fails without posting when initializeUpload errors', async () => {
    mockFetch.mockReset().mockResolvedValue({ ok: false, status: 401, text: async () => 'no' });
    const result = await linkedinPublisher.publish(INPUT);
    expect(result.success).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('fails without posting when the byte upload errors', async () => {
    mockFetch
      .mockReset()
      .mockResolvedValueOnce(INIT_OK)
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'err' });
    const result = await linkedinPublisher.publish(INPUT);
    expect(result.success).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('fails cleanly when credentials are missing', async () => {
    secrets.linkedin = '';
    const result = await linkedinPublisher.publish(INPUT);
    expect(result.success).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('linkedinPublisher.isConfigured', () => {
  it('is true only when both token and org id resolve', async () => {
    await expect(linkedinPublisher.isConfigured()).resolves.toBe(true);
    secrets.linkedin_org_id = '';
    await expect(linkedinPublisher.isConfigured()).resolves.toBe(false);
  });
});
