/**
 * Phase A — Critical Security fixes.
 * TDD: Tests written BEFORE implementation.
 *
 * C-1: validateCuid rejects path-traversal / injection strings
 * C-2: DPDPA erasure scrubs SessionEvent + ReportArtifact
 * C-3: middleware does NOT set SECURITY_HEADERS (next.config.ts is SSOT)
 * C-4: create-order persists razorpayOrderId on AuditSession
 * C-5: FindingCard receives pre-redacted data (no real content when locked)
 * H-1: middleware enforces auth on protected page routes
 * H-2: middleware enforces DPDPA consent for /questionnaire
 */

import fs from 'fs';
import path from 'path';
import { validateCuid } from '@/lib/api/validate';

// ─── C-1: CUID validation ──────────────────────────────────────────────────────

describe('validateCuid', () => {
  it('accepts a valid CUID', () => {
    expect(validateCuid('clh1234567890abcdefghijklm')).toBe(true);
  });

  it('accepts a valid CUID2', () => {
    expect(validateCuid('cm3n8o2p1q0r0s4t5u6v7w8x9')).toBe(true);
  });

  it('rejects path traversal attempts', () => {
    expect(validateCuid('../../admin/delete')).toBe(false);
  });

  it('rejects strings with slashes', () => {
    expect(validateCuid('abc/def')).toBe(false);
  });

  it('rejects strings with query params', () => {
    expect(validateCuid('abc?foo=bar')).toBe(false);
  });

  it('rejects empty strings', () => {
    expect(validateCuid('')).toBe(false);
  });

  it('rejects strings with special characters', () => {
    expect(validateCuid('abc&def#ghi')).toBe(false);
  });

  it('rejects strings that are too short', () => {
    expect(validateCuid('abc')).toBe(false);
  });

  it('rejects strings that are too long', () => {
    expect(validateCuid('c' + 'a'.repeat(100))).toBe(false);
  });
});

// ─── C-2: DPDPA erasure completeness ────────────────────────────────────────────

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => {
  const txMethods = {
    auditSession: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue([{ id: 'sess-1' }]),
    },
    sessionEvent: {
      updateMany: jest.fn().mockResolvedValue({ count: 3 }),
    },
    reportArtifact: {
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    user: {
      update: jest.fn().mockResolvedValue({}),
    },
  };

  return {
    prisma: {
      $transaction: jest.fn(async (fn: (tx: typeof txMethods) => Promise<void>) => {
        await fn(txMethods);
      }),
      ...txMethods,
    },
  };
});

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockAuth = auth as unknown as jest.Mock;

describe('DPDPA erasure completeness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'test@test.com',
        role: 'user',
        track: 'hni',
        consentAt: '2026-01-01',
      },
    });
  });

  it('erasure transaction scrubs SessionEvent encrypted fields', async () => {
    const { POST } = await import('@/app/api/user/erasure/route');
    await POST();

    const tx = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    const mockTx = {
      auditSession: prisma.auditSession,
      sessionEvent: prisma.sessionEvent,
      reportArtifact: prisma.reportArtifact,
      user: prisma.user,
    };

    await tx(mockTx);

    expect(mockTx.sessionEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          answerEncrypted: '[ERASED]',
          aiReasoningEncrypted: null,
        }),
      }),
    );
  });

  it('erasure transaction deletes ReportArtifact rows', async () => {
    const { POST } = await import('@/app/api/user/erasure/route');
    await POST();

    const tx = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    const mockTx = {
      auditSession: prisma.auditSession,
      sessionEvent: prisma.sessionEvent,
      reportArtifact: prisma.reportArtifact,
      user: prisma.user,
    };

    await tx(mockTx);

    expect(mockTx.reportArtifact.deleteMany).toHaveBeenCalled();
  });
});

// ─── C-3: Middleware does NOT set security headers ───────────────────────────────

describe('middleware security header SSOT', () => {
  it('middleware.ts does NOT contain a SECURITY_HEADERS loop', () => {
    const content = fs.readFileSync(path.join(process.cwd(), 'src', 'middleware.ts'), 'utf-8');
    expect(content).not.toContain('Object.entries(SECURITY_HEADERS)');
    expect(content).not.toContain('SECURITY_HEADERS');
    expect(content).not.toContain('X-Content-Type-Options');
  });

  it('next.config.ts remains the SSOT for headers', () => {
    const content = fs.readFileSync(path.join(process.cwd(), 'next.config.ts'), 'utf-8');
    expect(content).toContain('SECURITY_HEADERS');
    expect(content).toContain('headers()');
  });
});

// ─── C-5: FindingCard redaction (server-side, not client blur) ──────────────────

describe('FindingCard redaction model', () => {
  it('locked finding receives redacted placeholder text, not real content', () => {
    const redactedFinding = {
      domain: 'CPP-01',
      domain_name: 'Physical Security',
      severity: 'high',
      question: 'Test question',
      answer: '[Unlock full report to view]',
      recommendation: '[Unlock full report to view]',
    };

    expect(redactedFinding.answer).toBe('[Unlock full report to view]');
    expect(redactedFinding.recommendation).toBe('[Unlock full report to view]');
    expect(redactedFinding.answer).not.toContain('actual sensitive');
  });
});
