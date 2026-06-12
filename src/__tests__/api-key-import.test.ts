/**
 * Phase 3 tests — importKeysFromEnv.
 * Intent: env secrets are imported into the encrypted vault exactly once —
 * placeholders are skipped, existing active keys are never overwritten
 * (idempotent, no accidental rotation), and key VALUES never appear in the
 * result. Boot-critical secrets must not be importable at all.
 */

const mockStoreApiKey = jest.fn();
const mockVerifyHealth = jest.fn();
jest.mock('@/lib/api-key-manager', () => ({
  storeApiKey: (...a: unknown[]) => mockStoreApiKey(...a),
  verifyApiKeyHealth: (...a: unknown[]) => mockVerifyHealth(...a),
}));

import { importKeysFromEnv, IMPORTABLE_PROVIDERS } from '@/lib/api-key-import';

const ENV_KEYS = [
  'GEMINI_API_KEY',
  'RESEND_API_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_SECRET',
  'LINKEDIN_ACCESS_TOKEN',
  'LINKEDIN_ORG_ID',
  'TURNSTILE_SECRET_KEY',
  'NEWS_API_KEY',
];

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  jest.clearAllMocks();
  mockVerifyHealth.mockResolvedValue(false);
  mockStoreApiKey.mockResolvedValue({ id: 'key-1' });
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('importKeysFromEnv', () => {
  it('imports real env values and skips unset/placeholder ones', async () => {
    process.env.RESEND_API_KEY = 're_real_key_123456';
    process.env.LINKEDIN_ACCESS_TOKEN = 'your-linkedin-token'; // placeholder
    const result = await importKeysFromEnv('admin@test');

    expect(result.imported).toContain('resend');
    expect(result.skipped).toContain('linkedin');
    expect(mockStoreApiKey).toHaveBeenCalledTimes(1);
    expect(mockStoreApiKey).toHaveBeenCalledWith(
      'resend',
      'resend',
      're_real_key_123456',
      'admin@test',
    );
  });

  it('never overwrites an existing active key (idempotent)', async () => {
    process.env.RESEND_API_KEY = 're_real_key_123456';
    mockVerifyHealth.mockResolvedValue(true);
    const result = await importKeysFromEnv('admin@test');

    expect(result.imported).toHaveLength(0);
    expect(result.skipped).toContain('resend');
    expect(mockStoreApiKey).not.toHaveBeenCalled();
  });

  it('returns provider names only — never key values', async () => {
    process.env.RESEND_API_KEY = 're_real_key_123456';
    const result = await importKeysFromEnv('admin@test');
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('re_real_key_123456');
  });

  it('excludes boot-critical secrets from the importable map', () => {
    const providers = Object.keys(IMPORTABLE_PROVIDERS);
    for (const banned of [
      'database_url',
      'nextauth_secret',
      'encryption_key',
      'ai_service_key',
      'google_client_secret',
    ]) {
      expect(providers).not.toContain(banned);
    }
  });
});
