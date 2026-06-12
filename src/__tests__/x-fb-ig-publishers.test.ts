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
    // INIT → APPEND → FINALIZE → tweet (4 calls)
    mockFetch
      .mockResolvedValueOnce(jsonOk({ media_id_string: 'media-1' })) // INIT
      .mockResolvedValueOnce({ ok: true, status: 204 }) // APPEND
      .mockResolvedValueOnce(jsonOk({ media_id_string: 'media-1' })) // FINALIZE
      .mockResolvedValueOnce(jsonOk({ data: { id: 'tweet-9' } })); // tweet
  });

  it('uploads media (INIT/APPEND/FINALIZE) then tweets with the media id', async () => {
    const result = await xPublisher.publish(INPUT);
    expect(result.success).toBe(true);
    expect(result.externalId).toBe('tweet-9');

    const [initUrl, initOpts] = mockFetch.mock.calls[0];
    expect(initUrl).toContain('upload.twitter.com/1.1/media/upload.json');
    expect(initUrl).toContain('command=INIT');
    expect(initOpts.headers.Authorization).toBe('Bearer x-token');

    const [appendUrl] = mockFetch.mock.calls[1];
    expect(appendUrl).toContain('upload.twitter.com/1.1/media/upload.json');

    const [finalizeUrl] = mockFetch.mock.calls[2];
    expect(finalizeUrl).toContain('command=FINALIZE');

    const [tweetUrl, tweetOpts] = mockFetch.mock.calls[3];
    expect(tweetUrl).toContain('api.x.com/2/tweets');
    const body = JSON.parse(tweetOpts.body);
    expect(body.text).toBe('Weekly digest');
    expect(body.media.media_ids).toEqual(['media-1']);
  });

  it('fails without tweeting when the INIT errors', async () => {
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
    // Token in Authorization header, not body or query string
    expect(opts.headers.Authorization).toBe('Bearer fb-token');
    expect(body.access_token).toBeUndefined();
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
    jest.useFakeTimers();
    secrets.instagram = 'ig-token';
    secrets.instagram_account_id = '171717';
    // container create → status poll (FINISHED) → media_publish
    mockFetch
      .mockResolvedValueOnce(jsonOk({ id: 'container-1' }))
      .mockResolvedValueOnce(jsonOk({ status_code: 'FINISHED' }))
      .mockResolvedValueOnce(jsonOk({ id: 'ig-post-3' }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a media container, polls status, then publishes it', async () => {
    const publishPromise = instagramPublisher.publish(INPUT);
    // Advance past the polling interval
    await jest.advanceTimersByTimeAsync(2_100);
    const result = await publishPromise;
    expect(result.success).toBe(true);
    expect(result.externalId).toBe('ig-post-3');

    const [containerUrl, containerOpts] = mockFetch.mock.calls[0];
    expect(containerUrl).toContain('/171717/media');
    expect(containerOpts.headers.Authorization).toBe('Bearer ig-token');
    const containerBody = JSON.parse(containerOpts.body);
    expect(containerBody.image_url).toBe(INPUT.imageUrl);
    expect(containerBody.caption).toBe('Weekly digest');
    // Token no longer in body (security fix)
    expect(containerBody.access_token).toBeUndefined();

    const [publishUrl, publishOpts] = mockFetch.mock.calls[2];
    expect(publishUrl).toContain('/171717/media_publish');
    expect(JSON.parse(publishOpts.body).creation_id).toBe('container-1');
  });

  it('fails without publishing when container creation errors', async () => {
    mockFetch.mockReset().mockResolvedValue({ ok: false, status: 400, text: async () => 'bad' });
    const result = await instagramPublisher.publish(INPUT);
    expect(result.success).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid account ID format', async () => {
    secrets.instagram_account_id = 'bad/id';
    const result = await instagramPublisher.publish(INPUT);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid');
  });

  it('isConfigured requires both token and account id', async () => {
    await expect(instagramPublisher.isConfigured()).resolves.toBe(true);
    secrets.instagram_account_id = '';
    await expect(instagramPublisher.isConfigured()).resolves.toBe(false);
  });
});
