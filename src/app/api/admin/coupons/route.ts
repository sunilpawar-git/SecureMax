/**
 * Admin coupons API — GET (list/filter/CSV export) + POST (create single/bulk).
 * Delegates all business logic to coupon-service.
 */

import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { listCoupons, createSingleCoupon, createBulkCoupons } from '@/lib/admin/coupon-service';
import { couponsToCsv } from '@/lib/admin/coupon-service';
import { CouponCreateSchema, CouponFilterSchema } from '@/lib/admin/validators';
import { ADMIN_ERR, COUPON_STRINGS } from '@/config/admin-strings';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = CouponFilterSchema.safeParse(params);
  if (!parsed.success) return apiError(ADMIN_ERR.INVALID_REQUEST, 400);

  try {
    const result = await listCoupons(parsed.data);
    if (parsed.data.format === 'csv') {
      return new Response(couponsToCsv(result.coupons), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="coupons.csv"',
        },
      });
    }
    return apiSuccess(result);
  } catch (err) {
    logger.error('Query failed', 'admin-coupons', { detail: String(err) });
    return apiError(COUPON_STRINGS.ERR_LOAD, 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(ADMIN_ERR.INVALID_REQUEST, 400);
  }

  const parsed = CouponCreateSchema.safeParse(body);
  if (!parsed.success) return apiError(ADMIN_ERR.INVALID_REQUEST, 400);

  const { mode, count, note, expiresAt } = parsed.data;
  const expiry = expiresAt ? new Date(expiresAt) : undefined;

  try {
    if (mode === 'single') {
      const coupon = await createSingleCoupon(session.user.id, note, expiry);
      return apiSuccess({ coupons: [{ code: coupon.code, id: coupon.id }] }, 201);
    }
    const coupons = await createBulkCoupons(session.user.id, count ?? 1, note, expiry);
    return apiSuccess({ coupons: coupons.map((c) => ({ code: c.code, id: c.id })) }, 201);
  } catch (err) {
    logger.error('Create failed', 'admin-coupons', { detail: String(err) });
    return apiError(COUPON_STRINGS.ERR_CREATE, 500);
  }
}
