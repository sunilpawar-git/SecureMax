/**
 * Vault-first secret resolution for rotatable third-party keys.
 *
 * Order: encrypted ApiKey vault (active key) → env var fallback → ''.
 * Vault read failures fall back to env (availability over strictness) —
 * the failure is logged, never swallowed silently.
 *
 * A short TTL cache avoids a DB roundtrip per call while still picking up
 * rotations quickly; admin rotate/revoke also invalidates immediately via
 * invalidateSecretCache(). Boot-critical secrets (DATABASE_URL,
 * NEXTAUTH_SECRET, ENCRYPTION_KEY, AI_SERVICE_*) must NEVER move here —
 * they are read from env before the vault is even reachable.
 */

import { getApiKey } from '@/lib/api-key-manager';
import { IMPORTABLE_PROVIDERS } from '@/lib/api-key-import';
import { API_KEY_PROVIDERS } from '@/lib/admin/validators';
import { logger } from '@/lib/logger';

export type SecretProvider = (typeof API_KEY_PROVIDERS)[number];

const SECRET_CACHE_TTL_MS = 60_000;

const cache = new Map<string, { value: string; expiresAt: number }>();

export async function getSecret(provider: SecretProvider): Promise<string> {
  if (!(API_KEY_PROVIDERS as readonly string[]).includes(provider)) {
    throw new Error(`Unknown secret provider: ${provider}`);
  }

  const hit = cache.get(provider);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value;
  }

  let value = '';
  try {
    const vaultKey = await getApiKey(provider, { decryptedKey: true });
    if (vaultKey) value = vaultKey.key;
  } catch (err) {
    logger.warn('Vault read failed — falling back to env', 'secrets', {
      provider,
      detail: String(err),
    });
  }

  if (!value) {
    value = IMPORTABLE_PROVIDERS[provider]?.() ?? '';
  }

  cache.set(provider, { value, expiresAt: Date.now() + SECRET_CACHE_TTL_MS });
  return value;
}

/** Drop one provider's cached value, or everything when called without args. */
export function invalidateSecretCache(provider?: string): void {
  if (provider) cache.delete(provider);
  else cache.clear();
}
