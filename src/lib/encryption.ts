import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ENCRYPTION } from '@/config/security';
import { env } from '@/lib/env';

const VERSION_PREFIX = ENCRYPTION.KEY_VERSION_PREFIX;

function getKey(): Buffer {
  const key = env.ENCRYPTION_KEY;
  if (!key || key.length < ENCRYPTION.KEY_LENGTH * 2) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string');
  }
  return Buffer.from(key, 'hex');
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(ENCRYPTION.IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION.ALGORITHM, getKey(), iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();
  return `${VERSION_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  // Strip version prefix if present; unversioned = legacy v1 key
  const raw = ciphertext.startsWith(VERSION_PREFIX)
    ? ciphertext.slice(VERSION_PREFIX.length)
    : ciphertext;

  const parts = raw.split(':');
  if (parts.length !== 3 || !parts[0] || !parts[1]) {
    throw new Error('Invalid ciphertext format');
  }
  const [ivHex, tagHex, data] = parts;

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = createDecipheriv(ENCRYPTION.ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
