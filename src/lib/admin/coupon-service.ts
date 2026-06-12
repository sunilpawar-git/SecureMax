/**
 * Coupon code business logic — generation, listing, revocation, redemption.
 * Codes are single-use; redemption atomically unlocks the linked audit session.
 * Expiry is derived from expiresAt at read/redeem time (never stored).
 */

import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from './actions';
import { toJsonValue } from '@/lib/prisma-utils';
import {
  ADMIN_ACTION_TYPE,
  ADMIN_ENTITY_TYPE,
  COUPON_ERR,
  COUPON_BULK_MAX,
} from '@/config/admin-strings';
import type { CouponCode, CouponStatus, Prisma } from '@/generated/prisma/client';

// Uppercase alphanumerics minus ambiguous chars (0/O, 1/I/L)
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const MAX_COLLISION_RETRIES = 5;

export function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

/** A coupon is redeemable only when ACTIVE and not past its expiry. */
export function isRedeemable(coupon: Pick<CouponCode, 'status' | 'expiresAt'>): boolean {
  if (coupon.status !== 'ACTIVE') return false;
  if (coupon.expiresAt && coupon.expiresAt <= new Date()) return false;
  return true;
}

/** Display status derives "expired" from expiresAt instead of storing it. */
export function displayStatus(
  coupon: Pick<CouponCode, 'status' | 'expiresAt'>,
): 'active' | 'redeemed' | 'revoked' | 'expired' {
  if (coupon.status === 'REDEEMED') return 'redeemed';
  if (coupon.status === 'REVOKED') return 'revoked';
  if (coupon.expiresAt && coupon.expiresAt <= new Date()) return 'expired';
  return 'active';
}

async function insertWithRetry(
  data: Omit<Prisma.CouponCodeUncheckedCreateInput, 'code'>,
): Promise<CouponCode> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.couponCode.create({ data: { ...data, code: generateCode() } });
    } catch (err) {
      // P2002 = unique constraint violation (code collision) — retry with a new code
      const isCollision =
        typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
      if (!isCollision || attempt >= MAX_COLLISION_RETRIES) throw err;
    }
  }
}

export async function createSingleCoupon(
  adminId: string,
  note?: string,
  expiresAt?: Date,
): Promise<CouponCode> {
  const coupon = await insertWithRetry({ createdById: adminId, note, expiresAt });
  await logAdminAction({
    adminId,
    actionType: ADMIN_ACTION_TYPE.COUPON_CREATED,
    entityType: ADMIN_ENTITY_TYPE.COUPON,
    entityId: coupon.id,
    metadata: toJsonValue({ code: coupon.code, note: note ?? null }),
  });
  return coupon;
}

export async function createBulkCoupons(
  adminId: string,
  count: number,
  note?: string,
  expiresAt?: Date,
): Promise<CouponCode[]> {
  const capped = Math.min(count, COUPON_BULK_MAX);
  const coupons: CouponCode[] = [];
  for (let i = 0; i < capped; i++) {
    coupons.push(await insertWithRetry({ createdById: adminId, note, expiresAt }));
  }
  await logAdminAction({
    adminId,
    actionType: ADMIN_ACTION_TYPE.COUPON_BULK_CREATED,
    entityType: ADMIN_ENTITY_TYPE.COUPON,
    entityId: coupons[0]?.id ?? 'none',
    metadata: toJsonValue({ count: coupons.length, note: note ?? null }),
  });
  return coupons;
}

/** Creates a pilot coupon for an enterprise lead and stores the code on the lead. */
export async function createLeadCoupon(
  adminId: string,
  leadId: string,
  company: string,
): Promise<CouponCode> {
  const coupon = await insertWithRetry({
    createdById: adminId,
    note: `Pilot coupon for lead: ${company} (${leadId})`,
  });
  await prisma.enterpriseLead.update({
    where: { id: leadId },
    data: { couponCode: coupon.code },
  });
  await logAdminAction({
    adminId,
    actionType: ADMIN_ACTION_TYPE.COUPON_CREATED,
    entityType: ADMIN_ENTITY_TYPE.COUPON,
    entityId: coupon.id,
    metadata: toJsonValue({ code: coupon.code, leadId }),
  });
  return coupon;
}

export interface RedeemResult {
  success: boolean;
  error?: string;
}

/**
 * Atomic redemption: validates the code is redeemable, the session belongs to
 * the redeeming user, then flips coupon → REDEEMED and session → paid in one
 * transaction. A durable WebhookLog entry records the redemption (Rule 15).
 * All failure modes return the same generic error to prevent code enumeration.
 */
export async function redeemCoupon(
  code: string,
  userId: string,
  sessionId: string,
): Promise<RedeemResult> {
  const genericFailure: RedeemResult = { success: false, error: COUPON_ERR.INVALID_OR_EXPIRED };

  try {
    await prisma.$transaction(async (tx) => {
      const coupon = await tx.couponCode.findUnique({ where: { code: code.toUpperCase() } });
      if (!coupon || !isRedeemable(coupon)) throw new Error('not_redeemable');

      const session = await tx.auditSession.findFirst({
        where: { id: sessionId, userId },
      });
      if (!session) throw new Error('session_not_owned');
      if (session.paid) throw new Error('already_paid');

      await tx.couponCode.update({
        where: { id: coupon.id, status: 'ACTIVE' as CouponStatus },
        data: {
          status: 'REDEEMED',
          redeemedById: userId,
          redeemedAt: new Date(),
          sessionId,
        },
      });

      await tx.auditSession.update({
        where: { id: sessionId },
        data: { paid: true },
      });

      await tx.webhookLog.create({
        data: {
          provider: 'coupon',
          eventType: 'coupon.redeemed',
          status: 'success',
          errorLog: JSON.stringify({ code: coupon.code, session_id: sessionId }),
        },
      });
    });
    return { success: true };
  } catch {
    return genericFailure;
  }
}

export async function revokeCoupon(code: string, adminId: string): Promise<RedeemResult> {
  const coupon = await prisma.couponCode.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon) return { success: false, error: COUPON_ERR.NOT_FOUND };
  if (coupon.status !== 'ACTIVE') {
    return { success: false, error: COUPON_ERR.INVALID_OR_EXPIRED };
  }

  await prisma.couponCode.update({
    where: { id: coupon.id },
    data: { status: 'REVOKED' },
  });
  await logAdminAction({
    adminId,
    actionType: ADMIN_ACTION_TYPE.COUPON_REVOKED,
    entityType: ADMIN_ENTITY_TYPE.COUPON,
    entityId: coupon.id,
    metadata: toJsonValue({ code: coupon.code }),
  });
  return { success: true };
}

export interface CouponFilter {
  status?: string;
  page?: number;
  limit?: number;
}

export async function listCoupons(filter: CouponFilter = {}) {
  const { status, page = 1, limit = 50 } = filter;

  const where: Prisma.CouponCodeWhereInput = {};
  if (status === 'expired') {
    where.status = 'ACTIVE';
    where.expiresAt = { lte: new Date() };
  } else if (status === 'active') {
    where.status = 'ACTIVE';
    where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];
  } else if (status === 'redeemed' || status === 'revoked') {
    where.status = status.toUpperCase() as CouponStatus;
  }

  const [coupons, total] = await Promise.all([
    prisma.couponCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        redeemedBy: { select: { email: true } },
      },
    }),
    prisma.couponCode.count({ where }),
  ]);

  return {
    coupons: coupons.map((c) => ({
      id: c.id,
      code: c.code,
      status: displayStatus(c),
      note: c.note,
      expiresAt: c.expiresAt,
      redeemedAt: c.redeemedAt,
      redeemedByEmail: c.redeemedBy?.email ?? null,
      sessionId: c.sessionId,
      createdAt: c.createdAt,
    })),
    total,
    page,
    limit,
  };
}

export function couponsToCsv(
  coupons: Array<{ code: string; status: string; note: string | null; createdAt: Date }>,
): string {
  const header = 'code,status,note,created_at';
  const rows = coupons.map((c) => {
    const note = (c.note ?? '').replace(/"/g, '""');
    return `${c.code},${c.status},"${note}",${c.createdAt.toISOString()}`;
  });
  return [header, ...rows].join('\n');
}
