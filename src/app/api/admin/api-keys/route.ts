/**
 * Admin API — Manage API keys securely
 * Protected endpoint for storing, rotating, and revoking API keys
 * POST /api/admin/api-keys?action=store|rotate|revoke
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import {
  storeApiKey,
  getApiKey,
  rotateApiKey,
  revokeApiKey,
  getApiKeyAuditLog,
} from '@/lib/api-key-manager';

export async function POST(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  const action = request.nextUrl.searchParams.get('action');
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    switch (action) {
      case 'store': {
        const { provider, keyName, keyValue } = body as { provider?: unknown; keyName?: unknown; keyValue?: unknown };
        if (!provider || !keyName || !keyValue) {
          return NextResponse.json(
            { error: 'Missing provider, keyName, or keyValue' },
            { status: 400 },
          );
        }

        const apiKey = await storeApiKey(
          String(provider),
          String(keyName),
          String(keyValue),
          session.user.email || 'admin',
        );

        return NextResponse.json({
          success: true,
          message: `API key for ${String(provider)} stored successfully`,
          keyId: apiKey.id,
        });
      }

      case 'rotate': {
        const { provider: rotProv, newKeyValue } = body as { provider?: unknown; newKeyValue?: unknown };
        if (!rotProv || !newKeyValue) {
          return NextResponse.json({ error: 'Missing provider or newKeyValue' }, { status: 400 });
        }

        const rotKey = await rotateApiKey(
          String(rotProv),
          String(newKeyValue),
          session.user.email || 'admin',
        );

        return NextResponse.json({
          success: true,
          message: `API key for ${String(rotProv)} rotated successfully`,
          keyId: rotKey.id,
        });
      }

      case 'revoke': {
        const { keyId: revKeyId, reason } = body as { keyId?: unknown; reason?: unknown };
        if (!revKeyId) {
          return NextResponse.json({ error: 'Missing keyId' }, { status: 400 });
        }

        await revokeApiKey(
          String(revKeyId),
          session.user.email || 'admin',
          reason != null ? String(reason) : undefined,
        );

        return NextResponse.json({
          success: true,
          message: 'API key revoked successfully',
        });
      }

      case 'audit': {
        const { keyId: audKeyId, limit: audLimit } = body as { keyId?: unknown; limit?: unknown };
        if (!audKeyId) {
          return NextResponse.json({ error: 'Missing keyId' }, { status: 400 });
        }

        const audits = await getApiKeyAuditLog(
          String(audKeyId),
          typeof audLimit === 'number' ? audLimit : 100,
        );

        return NextResponse.json({
          success: true,
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
        return NextResponse.json(
          { error: 'Invalid action. Use: store, rotate, revoke, audit' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('[admin-api-keys] Operation failed', { detail: String(error) });
    return NextResponse.json({ error: 'Failed to manage API key' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) return forbiddenResponse();

  const provider = request.nextUrl.searchParams.get('provider');
  if (!provider) {
    return NextResponse.json({ error: 'Missing provider parameter' }, { status: 400 });
  }

  // Check if provider has an active key (without returning the key itself)
  const keyInfo = await getApiKey(provider);
  if (!keyInfo) {
    return NextResponse.json({ exists: false, provider });
  }

  return NextResponse.json({
    exists: true,
    provider,
    message: 'Active API key found (key content not returned for security)',
  });
}
