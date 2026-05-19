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
} from '@/lib/api-key-manager';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  const action = request.nextUrl.searchParams.get('action');
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid request body', 400);
  }

  try {
    switch (action) {
      case 'store': {
        const { provider, keyName, keyValue } = body as {
          provider?: unknown;
          keyName?: unknown;
          keyValue?: unknown;
        };
        if (!provider || !keyName || !keyValue) {
          return apiError('Missing provider, keyName, or keyValue', 400);
        }

        const apiKey = await storeApiKey(
          String(provider),
          String(keyName),
          String(keyValue),
          session.user.email || 'admin',
        );

        return apiSuccess({
          message: `API key for ${String(provider)} stored successfully`,
          keyId: apiKey.id,
        });
      }

      case 'rotate': {
        const { provider: rotProv, newKeyValue } = body as {
          provider?: unknown;
          newKeyValue?: unknown;
        };
        if (!rotProv || !newKeyValue) {
          return apiError('Missing provider or newKeyValue', 400);
        }

        const rotKey = await rotateApiKey(
          String(rotProv),
          String(newKeyValue),
          session.user.email || 'admin',
        );

        return apiSuccess({
          message: `API key for ${String(rotProv)} rotated successfully`,
          keyId: rotKey.id,
        });
      }

      case 'revoke': {
        const { keyId: revKeyId, reason } = body as { keyId?: unknown; reason?: unknown };
        if (!revKeyId) {
          return apiError('Missing keyId', 400);
        }

        await revokeApiKey(
          String(revKeyId),
          session.user.email || 'admin',
          reason != null ? String(reason) : undefined,
        );

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

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) return forbiddenResponse();

  const provider = request.nextUrl.searchParams.get('provider');
  if (!provider) {
    return apiError('Missing provider parameter', 400);
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
