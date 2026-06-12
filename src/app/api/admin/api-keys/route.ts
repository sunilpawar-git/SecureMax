/**
 * Admin API — Manage API keys securely
 * Protected endpoint for storing, rotating, and revoking API keys
 * POST /api/admin/api-keys?action=store|rotate|revoke
 */

import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import {
  storeApiKey,
  getApiKey,
  rotateApiKey,
  revokeApiKey,
  getApiKeyAuditLog,
  listApiKeys,
} from '@/lib/api-key-manager';
import { logAdminAction } from '@/lib/admin/actions';
import { importKeysFromEnv } from '@/lib/api-key-import';
import { invalidateSecretCache } from '@/lib/secrets';
import { ApiKeyStoreSchema, ApiKeyRotateSchema, ApiKeyRevokeSchema } from '@/lib/admin/validators';
import { ADMIN_ACTION_TYPE, ADMIN_ENTITY_TYPE, ADMIN_ERR } from '@/config/admin-strings';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  const action = request.nextUrl.searchParams.get('action');

  // import-env takes no body — handled before the JSON parse below
  if (action === 'import-env') {
    try {
      const result = await importKeysFromEnv(session.user.email || 'admin');
      invalidateSecretCache();
      await logAdminAction({
        adminId: session.user.id,
        actionType: ADMIN_ACTION_TYPE.API_KEY_IMPORT,
        entityType: ADMIN_ENTITY_TYPE.API_KEY,
        entityId: 'env-import',
        metadata: { imported: result.imported, skipped: result.skipped },
      });
      return apiSuccess(result);
    } catch (error) {
      logger.error('Env import failed', 'admin-api-keys', { detail: String(error) });
      return apiError('Failed to import keys from environment', 500);
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid request body', 400);
  }

  try {
    switch (action) {
      case 'store': {
        const parsed = ApiKeyStoreSchema.safeParse(body);
        if (!parsed.success) {
          return apiError(ADMIN_ERR.INVALID_REQUEST, 400);
        }

        const apiKey = await storeApiKey(
          parsed.data.provider,
          parsed.data.keyName,
          parsed.data.keyValue,
          session.user.email || 'admin',
        );
        invalidateSecretCache(parsed.data.provider);
        await logAdminAction({
          adminId: session.user.id,
          actionType: ADMIN_ACTION_TYPE.API_KEY_ADD,
          entityType: ADMIN_ENTITY_TYPE.API_KEY,
          entityId: apiKey.id,
          metadata: { provider: parsed.data.provider },
        });

        return apiSuccess({
          message: `API key for ${parsed.data.provider} stored successfully`,
          keyId: apiKey.id,
        });
      }

      case 'rotate': {
        const parsed = ApiKeyRotateSchema.safeParse(body);
        if (!parsed.success) {
          return apiError(ADMIN_ERR.INVALID_REQUEST, 400);
        }

        const rotKey = await rotateApiKey(
          parsed.data.provider,
          parsed.data.newKeyValue,
          session.user.email || 'admin',
        );
        invalidateSecretCache(parsed.data.provider);
        await logAdminAction({
          adminId: session.user.id,
          actionType: ADMIN_ACTION_TYPE.API_KEY_ROTATE,
          entityType: ADMIN_ENTITY_TYPE.API_KEY,
          entityId: rotKey.id,
          metadata: { provider: parsed.data.provider },
        });

        return apiSuccess({
          message: `API key for ${parsed.data.provider} rotated successfully`,
          keyId: rotKey.id,
        });
      }

      case 'revoke': {
        const parsed = ApiKeyRevokeSchema.safeParse(body);
        if (!parsed.success) {
          return apiError(ADMIN_ERR.INVALID_REQUEST, 400);
        }

        await revokeApiKey(parsed.data.keyId, session.user.email || 'admin', parsed.data.reason);
        // Revoke is by keyId (provider unknown here) — drop the whole cache
        invalidateSecretCache();
        await logAdminAction({
          adminId: session.user.id,
          actionType: ADMIN_ACTION_TYPE.API_KEY_REVOKE,
          entityType: ADMIN_ENTITY_TYPE.API_KEY,
          entityId: parsed.data.keyId,
          metadata: { reason: parsed.data.reason ?? null },
        });

        return apiSuccess({ message: 'API key revoked successfully' });
      }

      case 'audit': {
        const { keyId: audKeyId, limit: audLimit } = body as { keyId?: unknown; limit?: unknown };
        if (!audKeyId) {
          return apiError('Missing keyId', 400);
        }

        const audits = await getApiKeyAuditLog(
          String(audKeyId),
          typeof audLimit === 'number' ? audLimit : 100,
        );

        return apiSuccess({
          audits: audits.map((a) => ({
            action: a.action,
            actor: a.actor,
            status: a.status,
            createdAt: a.createdAt,
            errorMsg: a.errorMsg,
          })),
        });
      }

      default:
        return apiError('Invalid action. Use: store, rotate, revoke, audit', 400);
    }
  } catch (error) {
    logger.error('Operation failed', 'admin-api-keys', { detail: String(error) });
    return apiError('Failed to manage API key', 500);
  }
}

/**
 * GET /api/admin/api-keys — list all keys (masked previews only).
 * GET /api/admin/api-keys?provider=X — existence check for one provider.
 * SECURITY: key values are NEVER returned by any GET.
 */
export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) return forbiddenResponse();

  const provider = request.nextUrl.searchParams.get('provider');
  if (!provider) {
    const keys = await listApiKeys();
    return apiSuccess({ keys });
  }

  const keyInfo = await getApiKey(provider);
  if (!keyInfo) {
    return apiSuccess({ exists: false, provider });
  }

  return apiSuccess({
    exists: true,
    provider,
    message: 'Active API key found (key content not returned for security)',
  });
}
