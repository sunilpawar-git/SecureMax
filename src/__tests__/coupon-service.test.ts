/**
 * Phase 3 tests — coupon service unit tests.
 * Verifies code generation, redeemability derivation, atomic redemption
 * (valid / used / expired / revoked / non-existent / wrong owner), and revoke.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockCouponFindUnique = jest.fn();
const mockCouponCreate = jest.fn();
const mockCouponUpdate = jest.fn();
const mockCouponFindMany = jest.fn();
const mockCouponCount = jest.fn();
const mockSessionFindFirst = jest.fn();
const mockSessionUpdate = jest.fn();
const mockWebhookCreate = jest.fn();
const mockAdminActionCreate = jest.fn().mockResolvedValue({ id: 'action-1' });
const mockLeadUpdate = jest.fn();

jest.mock('@/lib/prisma', () => {
  const tx = {
    couponCode: {
      findUnique: (...args: unknown[]) => mockCouponFindUnique(...args),
      update: (...args: unknown[]) => mockCouponUpdate(...args),
    },
    auditSession: {
      findFirst: (...args: unknown[]) => mockSessionFindFirst(...args),
      update: (...args: unknown[]) => mockSessionUpdate(...args),
    },
    webhookLog: {
      create: (...args: unknown[]) => mockWebhookCreate(...args),
    },
  };
  return {
    prisma: {
      couponCode: {
        findUnique: (...args: unknown[]) => mockCouponFindUnique(...args),
        create: (...args: unknown[]) => mockCouponCreate(...args),
        update: (...args: unknown[]) => mockCouponUpdate(...args),
        findMany: (...args: unknown[]) => mockCouponFindMany(...args),
        count: (...args: unknown[]) => mockCouponCount(...args),
      },
      auditSession: tx.auditSession,
      webhookLog: tx.webhookLog,
      enterpriseLead: { update: (...args: unknown[]) => mockLeadUpdate(...args) },
      adminAction: { create: (...args: unknown[]) => mockAdminActionCreate(...args) },
      $transaction: async (fn: (t: typeof tx) => Promise<void>) => fn(tx),
    },
  };
});

import {
  generateCode,
  isRedeemable,
  displayStatus,
  createSingleCoupon,
  redeemCoupon,
  revokeCoupon,
  couponsToCsv,
} from '@/lib/admin/coupon-service';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('generateCode', () => {
  it('produces 8-char codes from the unambiguous alphabet', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateCode();
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
      // No ambiguous characters ever
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it('produces distinct codes (sanity, not proof)', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateCode()));
    expect(codes.size).toBeGreaterThan(95);
  });
});

describe('isRedeemable / displayStatus — expiry derived, not stored', () => {
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);

  it('ACTIVE without expiry is redeemable', () => {
    expect(isRedeemable({ status: 'ACTIVE', expiresAt: null } as any)).toBe(true);
  });

  it('ACTIVE with future expiry is redeemable', () => {
    expect(isRedeemable({ status: 'ACTIVE', expiresAt: future } as any)).toBe(true);
  });

  it('ACTIVE with past expiry is NOT redeemable and displays as expired', () => {
    const coupon = { status: 'ACTIVE', expiresAt: past } as any;
    expect(isRedeemable(coupon)).toBe(false);
    expect(displayStatus(coupon)).toBe('expired');
  });

  it('REDEEMED and REVOKED are never redeemable', () => {
    expect(isRedeemable({ status: 'REDEEMED', expiresAt: null } as any)).toBe(false);
    expect(isRedeemable({ status: 'REVOKED', expiresAt: null } as any)).toBe(false);
    expect(displayStatus({ status: 'REDEEMED', expiresAt: null } as any)).toBe('redeemed');
    expect(displayStatus({ status: 'REVOKED', expiresAt: past } as any)).toBe('revoked');
  });
});

describe('createSingleCoupon', () => {
  it('inserts a coupon and logs an AdminAction', async () => {
    mockCouponCreate.mockResolvedValue({ id: 'c1', code: 'ABCD2345' });

    const coupon = await createSingleCoupon('admin-1', 'pilot');
    expect(coupon.code).toBe('ABCD2345');
    expect(mockCouponCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ createdById: 'admin-1', note: 'pilot' }),
      }),
    );
    expect(mockAdminActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: 'coupon_created', entityType: 'coupon' }),
      }),
    );
  });

  it('retries on code collision (P2002)', async () => {
    mockCouponCreate
      .mockRejectedValueOnce({ code: 'P2002' })
      .mockResolvedValueOnce({ id: 'c2', code: 'WXYZ6789' });

    const coupon = await createSingleCoupon('admin-1');
    expect(coupon.code).toBe('WXYZ6789');
    expect(mockCouponCreate).toHaveBeenCalledTimes(2);
  });
});

describe('redeemCoupon', () => {
  const activeCoupon = { id: 'c1', code: 'ABCD2345', status: 'ACTIVE', expiresAt: null };
  const ownedSession = { id: 'sess-1', userId: 'user-1', paid: false };

  it('redeems a valid code: coupon REDEEMED + session paid + durable log', async () => {
    mockCouponFindUnique.mockResolvedValue(activeCoupon);
    mockSessionFindFirst.mockResolvedValue(ownedSession);

    const result = await redeemCoupon('abcd2345', 'user-1', 'sess-1');
    expect(result.success).toBe(true);

    // Lookup is case-insensitive via uppercase normalization
    expect(mockCouponFindUnique).toHaveBeenCalledWith({ where: { code: 'ABCD2345' } });

    expect(mockCouponUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REDEEMED',
          redeemedById: 'user-1',
          sessionId: 'sess-1',
        }),
      }),
    );
    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sess-1' }, data: { paid: true } }),
    );
    expect(mockWebhookCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ provider: 'coupon', eventType: 'coupon.redeemed' }),
      }),
    );
  });

  it('rejects an already-redeemed code with the generic error', async () => {
    mockCouponFindUnique.mockResolvedValue({ ...activeCoupon, status: 'REDEEMED' });
    const result = await redeemCoupon('ABCD2345', 'user-1', 'sess-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid or expired code');
    expect(mockSessionUpdate).not.toHaveBeenCalled();
  });

  it('rejects an expired code with the generic error', async () => {
    mockCouponFindUnique.mockResolvedValue({
      ...activeCoupon,
      expiresAt: new Date(Date.now() - 1000),
    });
    const result = await redeemCoupon('ABCD2345', 'user-1', 'sess-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid or expired code');
  });

  it('rejects a non-existent code with the SAME generic error (anti-enumeration)', async () => {
    mockCouponFindUnique.mockResolvedValue(null);
    const result = await redeemCoupon('NOPE9999', 'user-1', 'sess-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid or expired code');
  });

  it('rejects redemption against a session owned by a different user', async () => {
    mockCouponFindUnique.mockResolvedValue(activeCoupon);
    mockSessionFindFirst.mockResolvedValue(null); // findFirst scoped by userId returns nothing

    const result = await redeemCoupon('ABCD2345', 'attacker', 'sess-1');
    expect(result.success).toBe(false);
    expect(mockSessionFindFirst).toHaveBeenCalledWith({
      where: { id: 'sess-1', userId: 'attacker' },
    });
    expect(mockCouponUpdate).not.toHaveBeenCalled();
    expect(mockSessionUpdate).not.toHaveBeenCalled();
  });

  it('rejects redemption on an already-paid session (coupon not burned)', async () => {
    mockCouponFindUnique.mockResolvedValue(activeCoupon);
    mockSessionFindFirst.mockResolvedValue({ ...ownedSession, paid: true });

    const result = await redeemCoupon('ABCD2345', 'user-1', 'sess-1');
    expect(result.success).toBe(false);
    expect(mockCouponUpdate).not.toHaveBeenCalled();
  });
});

describe('revokeCoupon', () => {
  it('revokes an active coupon and logs the action', async () => {
    mockCouponFindUnique.mockResolvedValue({ id: 'c1', code: 'ABCD2345', status: 'ACTIVE' });
    mockCouponUpdate.mockResolvedValue({});

    const result = await revokeCoupon('ABCD2345', 'admin-1');
    expect(result.success).toBe(true);
    expect(mockCouponUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'REVOKED' } }),
    );
    expect(mockAdminActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: 'coupon_revoked' }),
      }),
    );
  });

  it('returns not-found for unknown codes', async () => {
    mockCouponFindUnique.mockResolvedValue(null);
    const result = await revokeCoupon('NOPE9999', 'admin-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Coupon not found');
  });

  it('refuses to revoke a redeemed coupon', async () => {
    mockCouponFindUnique.mockResolvedValue({ id: 'c1', code: 'ABCD2345', status: 'REDEEMED' });
    const result = await revokeCoupon('ABCD2345', 'admin-1');
    expect(result.success).toBe(false);
    expect(mockCouponUpdate).not.toHaveBeenCalled();
  });
});

describe('couponsToCsv', () => {
  it('escapes quotes in notes and emits a header', () => {
    const csv = couponsToCsv([
      {
        code: 'ABCD2345',
        status: 'active',
        note: 'For "Acme" pilot',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('code,status,note,created_at');
    expect(lines[1]).toContain('ABCD2345');
    expect(lines[1]).toContain('""Acme""');
  });
});
