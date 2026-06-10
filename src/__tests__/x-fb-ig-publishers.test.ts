/**
 * Phase 9 tests — X, Facebook, Instagram publishers.
 * Intent: each adapter follows its platform's documented flow (X: media
 * upload → tweet; FB: page photo post; IG: container → publish), resolves
 * secrets via getSecret, never leaks tokens into URLs it reports, and
 * translates every failure into { success: false }.
 */

const secrets: Record<string, string> = {};
jest.mock('@/lib/secrets', () => ({
  getSecret: (p: string) => Promise.resolve(secrets[p] ?? ''),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

import { xPublisher } from '@/lib/social/x-publisher';
import { facebookPublisher } from '@/lib/social/facebook-publisher';
import { instagramPublisher } from '@/lib/social/instagram-publisher';

const mockFetch = jest.fn();
const realFetch = global.fetch;

const INPUT = {
  caption: 'Weekly digest',
  imagePng: Buffer.from('png-bytes'),
  imageUrl: 'https://app.example.com/api/newsletter/nl-1/image',
};

function jsonOk(payload: unknown) {
  return { ok: true, status: 200, json: async () => payload, text: async () => '' };
}

beforeEach(() => {
  // mockReset (not clearAllMocks) — drops queued mockResolvedValueOnce values
  // so one platform's scripted responses can never leak into another's test
  mockFetch.mockReset();
  for (const k of Object.keys(secrets)) delete secrets[k];
  global.fetch = mockFetch as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = realFetch;
});

describe('xPublisher', () => {
  beforeEach(() => {
    secrets.x_api = 'x-token';
    mockFetch
      .mockResolvedValueOnce(jsonOk({ data: { id: 'media-1' } }))
      .mockResolvedValueOnce(jsonOk({ data: { id: 'tweet-9' } }));
  });

  it('uploads media then tweets with the media id', async () => {
    const result = await xPublisher.publish(INPUT);
    expect(result.success).toBe(true);
    expect(result.externalId).toBe('tweet-9');

    const [uploadUrl, uploadOpts] = mockFetch.mock.calls[0];
    expect(uploadUrl).toContain('api.x.com/2/media/upload');
    expect(uploadOpts.headers.Authorization).toBe('Bearer x-token');

    const [tweetUrl, tweetOpts] = mockFetch.mock.calls[1];
    expect(tweetUrl).toContain('api.x.com/2/tweets');
    const body = JSON.parse(tweetOpts.body);
    expect(body.text).toBe('Weekly digest');
    expect(body.media.media_ids).toEqual(['media-1']);
  });

  it('fails without tweeting when the upload errors', async () => {
    mockFetch.mockReset().mockResolvedValue({ ok: false, status: 403, text: async () => 'no' });
    const result = await xPublisher.publish(INPUT);
    expect(result.success).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('isConfigured reflects the x_api secret', async () => {
    await expect(xPublisher.isConfigured()).resolves.toBe(true);
    secrets.x_api = '';
    await expect(xPublisher.isConfigured()).resolves.toBe(false);
  });
});

describe('facebookPublisher', () => {
  beforeEach(() => {
    secrets.facebook_page = 'fb-token';
    secrets.facebook_page_id = '424242';
    mockFetch.mockResolvedValueOnce(jsonOk({ id: 'photo-1', post_id: 'page_post-7' }));
  });

  it('posts the public image URL to the page photos edge', async () => {
    const result = await facebookPublisher.publish(INPUT);
    expect(result.success).toBe(true);
    expect(result.externalId).toBe('page_post-7');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('graph.facebook.com');
    expect(url).toContain('/424242/photos');
    const body = JSON.parse(opts.body);
    expect(body.url).toBe(INPUT.imageUrl);
    expect(body.caption).toBe('Weekly digest');
    // Token travels in the body, never in the query string
    expect(url).not.toContain('fb-token');
  });

  it('isConfigured requires both token and page id', async () => {
    await expect(facebookPublisher.isConfigured()).resolves.toBe(true);
    secrets.facebook_page_id = '';
    await expect(facebookPublisher.isConfigured()).resolves.toBe(false);
  });
});

describe('instagramPublisher', () => {
  beforeEach(() => {
    secrets.instagram = 'ig-token';
    secrets.instagram_account_id = '171717';
    mockFetch
      .mockResolvedValueOnce(jsonOk({ id: 'container-1' }))
      .mockResolvedValueOnce(jsonOk({ id: 'ig-post-3' }));
  });

  it('creates a media container then publishes it', async () => {
    const result = await instagramPublisher.publish(INPUT);
    expect(result.success).toBe(true);
    expect(result.externalId).toBe('ig-post-3');

    const [containerUrl, containerOpts] = mockFetch.mock.calls[0];
    expect(containerUrl).toContain('/171717/media');
    const containerBody = JSON.parse(containerOpts.body);
    expect(containerBody.image_url).toBe(INPUT.imageUrl);
    expect(containerBody.caption).toBe('Weekly digest');

    const [publishUrl, publishOpts] = mockFetch.mock.calls[1];
    expect(publishUrl).toContain('/171717/media_publish');
    expect(JSON.parse(publishOpts.body).creation_id).toBe('container-1');
  });

  it('fails without publishing when container creation errors', async () => {
    mockFetch.mockReset().mockResolvedValue({ ok: false, status: 400, text: async () => 'bad' });
    const result = await instagramPublisher.publish(INPUT);
    expect(result.success).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('isConfigured requires both token and account id', async () => {
    await expect(instagramPublisher.isConfigured()).resolves.toBe(true);
    secrets.instagram_account_id = '';
    await expect(instagramPublisher.isConfigured()).resolves.toBe(false);
  });
});
