/**
 * One-click import of env secrets into the encrypted API key vault.
 *
 * IMPORTABLE_PROVIDERS is the SSOT for which secrets may be imported.
 * Boot-critical secrets are deliberately excluded and must never be added:
 *  - ENCRYPTION_KEY decrypts this very vault (circular dependency)
 *  - DATABASE_URL / NEXTAUTH_SECRET / AI_SERVICE_* are required before the
 *    DB or session layer is available
 *  - OAuth client secrets are consumed by NextAuth at boot
 *
 * Import is idempotent: a provider with an existing ACTIVE key is always
 * skipped (no accidental rotation). Results carry provider names only —
 * never key values.
 */

import { env, isPlaceholder } from '@/lib/env';
import { storeApiKey, verifyApiKeyHealth } from '@/lib/api-key-manager';
import { logger } from '@/lib/logger';

export const IMPORTABLE_PROVIDERS: Record<string, () => string> = {
  gemini: () => env.GEMINI_API_KEY,
  resend: () => env.RESEND_API_KEY,
  razorpay: () => env.RAZORPAY_KEY_ID,
  razorpay_secret: () => env.RAZORPAY_SECRET,
  linkedin: () => env.LINKEDIN_ACCESS_TOKEN,
  linkedin_org_id: () => env.LINKEDIN_ORG_ID,
  turnstile: () => env.TURNSTILE_SECRET_KEY,
  news_api: () => env.NEWS_API_KEY,
};

export interface ImportResult {
  imported: string[];
  skipped: string[];
}

export async function importKeysFromEnv(actor: string): Promise<ImportResult> {
  const imported: string[] = [];
  const skipped: string[] = [];

  for (const [provider, read] of Object.entries(IMPORTABLE_PROVIDERS)) {
    const value = read();
    if (isPlaceholder(value)) {
      skipped.push(provider);
      continue;
    }
    if (await verifyApiKeyHealth(provider)) {
      // Active key already in the vault — never overwrite from env
      skipped.push(provider);
      continue;
    }
    await storeApiKey(provider, provider, value, actor);
    imported.push(provider);
  }

  logger.info('Env key import completed', 'api-key-import', {
    imported: imported.join(','),
    skipped: skipped.join(','),
  });
  return { imported, skipped };
}
