/**
 * API Key Manager — Secure server-side key management with encryption
 * Handles storage, retrieval, rotation, and audit logging of API keys
 * 
 * Security:
 * - Keys encrypted at rest using AES-256-GCM
 * - Keys only decrypted in server components/API routes
 * - Audit trail for all key access
 * - Key rotation with zero-downtime
 * - Per-provider key status tracking
 */

import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';
import type { ApiKey, ApiKeyAudit } from '@/generated/prisma/client';

export interface ApiKeyManagerOptions {
  provider: string; // "gemini", "openai", etc.
  decryptedKey?: boolean; // Return decrypted key for immediate use
}

/**
 * Store a new API key securely
 * Encrypts the key and logs the action
 */
export async function storeApiKey(
  provider: string,
  keyName: string,
  keyValue: string,
  actor: string = 'system'
): Promise<ApiKey> {
  const encrypted = encrypt(keyValue);
  const encryptedName = encrypt(keyName);

  const apiKey = await prisma.apiKey.upsert({
    where: { provider_status: { provider, status: 'active' } },
    create: {
      provider,
      keyNameEncrypted: encryptedName.ciphertext,
      keyEncrypted: encrypted.ciphertext,
      status: 'active',
    },
    update: {
      // If updating, mark old as rotated first
      status: 'rotated',
      rotatedAt: new Date(),
    },
  });

  // Log the action
  await logApiKeyAudit({
    apiKeyId: apiKey.id,
    action: 'created',
    actor,
    status: 'success',
  });

  return apiKey;
}

/**
 * Retrieve the active API key for a provider
 * Returns decrypted key only when explicitly requested
 */
export async function getApiKey(
  provider: string,
  options: ApiKeyManagerOptions = {}
): Promise<{ key: string; keyId: string } | null> {
  const apiKey = await prisma.apiKey.findFirst({
    where: { provider, status: 'active' },
  });

  if (!apiKey) {
    return null;
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  // Log access
  await logApiKeyAudit({
    apiKeyId: apiKey.id,
    action: 'used',
    actor: 'api',
    status: 'success',
  });

  if (options.decryptedKey) {
    // Decrypt only when explicitly needed
    const decrypted = decrypt(apiKey.keyEncrypted);
    return { key: decrypted, keyId: apiKey.id };
  }

  return { key: apiKey.keyEncrypted, keyId: apiKey.id };
}

/**
 * Rotate API key to a new value
 * Marks old key as rotated and creates new active key
 */
export async function rotateApiKey(
  provider: string,
  newKeyValue: string,
  actor: string = 'admin'
): Promise<ApiKey> {
  // Mark old key as rotated
  const oldKey = await prisma.apiKey.findFirst({
    where: { provider, status: 'active' },
  });

  if (oldKey) {
    await prisma.apiKey.update({
      where: { id: oldKey.id },
      data: {
        status: 'rotated',
        rotatedAt: new Date(),
      },
    });

    await logApiKeyAudit({
      apiKeyId: oldKey.id,
      action: 'rotated',
      actor,
      status: 'success',
    });
  }

  // Create new key
  const encrypted = encrypt(newKeyValue);
  const encryptedName = encrypt(`${provider}-${Date.now()}`);

  const newKey = await prisma.apiKey.create({
    data: {
      provider,
      keyNameEncrypted: encryptedName.ciphertext,
      keyEncrypted: encrypted.ciphertext,
      status: 'active',
    },
  });

  await logApiKeyAudit({
    apiKeyId: newKey.id,
    action: 'created',
    actor,
    status: 'success',
  });

  return newKey;
}

/**
 * Revoke an API key
 * Marks it as revoked to prevent further use
 */
export async function revokeApiKey(
  apiKeyId: string,
  actor: string = 'admin',
  reason?: string
): Promise<ApiKey> {
  const apiKey = await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: {
      status: 'revoked',
      revokedAt: new Date(),
    },
  });

  await logApiKeyAudit({
    apiKeyId,
    action: 'revoked',
    actor,
    status: 'success',
    errorMsg: reason,
  });

  return apiKey;
}

/**
 * Get audit log for an API key
 */
export async function getApiKeyAuditLog(
  apiKeyId: string,
  limit: number = 100
): Promise<ApiKeyAudit[]> {
  return prisma.apiKeyAudit.findMany({
    where: { apiKeyId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Internal: Log API key audit event
 */
async function logApiKeyAudit(data: {
  apiKeyId: string;
  action: string;
  actor?: string;
  ipAddress?: string;
  userAgent?: string;
  status: string;
  errorMsg?: string;
}): Promise<ApiKeyAudit> {
  return prisma.apiKeyAudit.create({
    data: {
      apiKeyId: data.apiKeyId,
      action: data.action,
      actor: data.actor,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      status: data.status,
      errorMsg: data.errorMsg,
    },
  });
}

/**
 * Health check: Verify API key is still valid
 * Call this periodically to catch revoked/expired keys
 */
export async function verifyApiKeyHealth(provider: string): Promise<boolean> {
  const apiKey = await prisma.apiKey.findFirst({
    where: { provider, status: 'active' },
  });

  return !!apiKey;
}
