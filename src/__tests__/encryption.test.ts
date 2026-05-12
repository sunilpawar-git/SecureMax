/**
 * Phase 1 tests — verify AES-256-GCM encryption utility.
 * Column-level encryption for session event answers and AI reasoning.
 */

import { encrypt, decrypt } from '@/lib/encryption';

const TEST_KEY = 'a'.repeat(64);

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

afterAll(() => {
  delete process.env.ENCRYPTION_KEY;
});

describe('Encryption (AES-256-GCM)', () => {
  it('encrypts and decrypts a simple string', () => {
    const plaintext = 'My gate code is shared with delivery staff';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertext for same input (random IV)', () => {
    const plaintext = 'sensitive answer';
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
  });

  it('ciphertext has 3 parts (iv:tag:data)', () => {
    const encrypted = encrypt('test');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);
  });

  it('throws on tampered ciphertext', () => {
    const encrypted = encrypt('test');
    const tampered = encrypted.slice(0, -2) + 'ff';
    expect(() => decrypt(tampered)).toThrow();
  });

  it('throws on invalid format', () => {
    expect(() => decrypt('not-valid')).toThrow('Invalid ciphertext format');
  });

  it('handles unicode and special characters', () => {
    const plaintext = 'गेट कोड: 1234 🔒 "double quotes"';
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it('handles empty string', () => {
    expect(decrypt(encrypt(''))).toBe('');
  });
});

describe('Encryption key validation', () => {
  it('throws when ENCRYPTION_KEY is missing', () => {
    const saved = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY');
    process.env.ENCRYPTION_KEY = saved;
  });

  it('throws when ENCRYPTION_KEY is too short', () => {
    const saved = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = 'tooshort';
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY');
    process.env.ENCRYPTION_KEY = saved;
  });
});
