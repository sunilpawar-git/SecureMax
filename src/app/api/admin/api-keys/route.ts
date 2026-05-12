/**
 * Admin API — Manage API keys securely
 * Protected endpoint for storing, rotating, and revoking API keys
 * POST /api/admin/api-keys?action=store|rotate|revoke
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  storeApiKey,
  getApiKey,
  rotateApiKey,
  revokeApiKey,
  getApiKeyAuditLog,
} from '@/lib/api-key-manager';

export async function POST(request: NextRequest) {
  // Verify admin access
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const action = request.nextUrl.searchParams.get('action');
  const body = await request.json();

  try {
    switch (action) {
      case 'store': {
        // Store a new API key
        if (!body.provider || !body.keyName || !body.keyValue) {
          return NextResponse.json(
            { error: 'Missing provider, keyName, or keyValue' },
            { status: 400 }
          );
        }

        const apiKey = await storeApiKey(
          body.provider,
          body.keyName,
          body.keyValue,
          session.user.email || 'admin'
        );

        return NextResponse.json({
          success: true,
          message: `API key for ${body.provider} stored successfully`,
          keyId: apiKey.id,
        });
      }

      case 'rotate': {
        // Rotate to a new API key
        if (!body.provider || !body.newKeyValue) {
          return NextResponse.json(
            { error: 'Missing provider or newKeyValue' },
            { status: 400 }
          );
        }

        const apiKey = await rotateApiKey(
          body.provider,
          body.newKeyValue,
          session.user.email || 'admin'
        );

        return NextResponse.json({
          success: true,
          message: `API key for ${body.provider} rotated successfully`,
          keyId: apiKey.id,
        });
      }

      case 'revoke': {
        // Revoke an API key
        if (!body.keyId) {
          return NextResponse.json(
            { error: 'Missing keyId' },
            { status: 400 }
          );
        }

        await revokeApiKey(
          body.keyId,
          session.user.email || 'admin',
          body.reason
        );

        return NextResponse.json({
          success: true,
          message: 'API key revoked successfully',
        });
      }

      case 'audit': {
        // Get audit log for an API key
        if (!body.keyId) {
          return NextResponse.json(
            { error: 'Missing keyId' },
            { status: 400 }
          );
        }

        const audits = await getApiKeyAuditLog(body.keyId, body.limit || 100);

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
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('API key management error:', error);
    return NextResponse.json(
      { error: 'Failed to manage API key' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Verify admin access
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const provider = request.nextUrl.searchParams.get('provider');
  if (!provider) {
    return NextResponse.json(
      { error: 'Missing provider parameter' },
      { status: 400 }
    );
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
