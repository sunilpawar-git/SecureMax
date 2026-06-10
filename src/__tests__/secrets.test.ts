/**
 * Phase 4 tests — getSecret() vault-first secret resolution.
 * Intent: an active vault key wins over env; env is the fallback when the
 * vault has nothing; results are cached briefly (no DB hit per call) but a
 * rotation/revoke can invalidate the cache immediately so a rotated key
 * takes effect without redeploy.
 */

const mockGetApiKey = jest.fn();
jest.mock('@/lib/api-key-manager', () => ({
  getApiKey: (...a: unknown[]) => mockGetApiKey(...a),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

import { getSecret, invalidateSecretCache } from '@/lib/secrets';

const saved = process.env.RESEND_API_KEY;

beforeEach(() => {
  jest.clearAllMocks();
  invalidateSecretCache();
  delete process.env.RESEND_API_KEY;
});

afterAll(() => {
  if (saved === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = saved;
});

describe('getSecret', () => {
  it('returns the decrypted vault key when one is active', async () => {
    process.env.RESEND_API_KEY = 'env-value';
    mockGetApiKey.mockResolvedValue({ key: 'vault-value', keyId: 'k1' });

    await expect(getSecret('resend')).resolves.toBe('vault-value');
    expect(mockGetApiKey).toHaveBeenCalledWith('resend', { decryptedKey: true });
  });

  it('falls back to env when the vault has no active key', async () => {
    process.env.RESEND_API_KEY = 'env-value';
    mockGetApiKey.mockResolvedValue(null);

    await expect(getSecret('resend')).resolves.toBe('env-value');
  });

  it('falls back to env when the vault read throws (availability over strictness)', async () => {
    process.env.RESEND_API_KEY = 'env-value';
    mockGetApiKey.mockRejectedValue(new Error('db down'));

    await expect(getSecret('resend')).resolves.toBe('env-value');
  });

  it('returns empty string when neither vault nor env has a value', async () => {
    mockGetApiKey.mockResolvedValue(null);
    await expect(getSecret('resend')).resolves.toBe('');
  });

  it('caches within the TTL — second call makes no DB hit', async () => {
    mockGetApiKey.mockResolvedValue({ key: 'vault-value', keyId: 'k1' });

    await getSecret('resend');
    await getSecret('resend');
    expect(mockGetApiKey).toHaveBeenCalledTimes(1);
  });

  it('invalidateSecretCache(provider) makes the next call re-read the vault', async () => {
    mockGetApiKey.mockResolvedValue({ key: 'old-value', keyId: 'k1' });
    await expect(getSecret('resend')).resolves.toBe('old-value');

    mockGetApiKey.mockResolvedValue({ key: 'new-value', keyId: 'k2' });
    invalidateSecretCache('resend');
    await expect(getSecret('resend')).resolves.toBe('new-value');
    expect(mockGetApiKey).toHaveBeenCalledTimes(2);
  });

  it('re-reads after the TTL expires (rotated key picked up)', async () => {
    jest.useFakeTimers();
    try {
      mockGetApiKey.mockResolvedValue({ key: 'old-value', keyId: 'k1' });
      await getSecret('resend');

      mockGetApiKey.mockResolvedValue({ key: 'new-value', keyId: 'k2' });
      jest.advanceTimersByTime(61_000);
      await expect(getSecret('resend')).resolves.toBe('new-value');
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects providers outside the allowlist', async () => {
    await expect(getSecret('not-a-provider' as never)).rejects.toThrow();
  });
});
