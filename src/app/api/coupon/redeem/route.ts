/**
 * User-facing coupon redemption — POST /api/coupon/redeem.
 * Rate-limited; returns a single generic error for all failure modes
 * (not found / expired / used / revoked) to prevent code enumeration.
 */

import { NextRequest } from 'next/server';
import { requireAuth, unauthorizedResponse, apiSuccess, apiError } from '@/lib/api';
import { checkRateLimit } from '@/lib/rate-limit';
import { redeemCoupon } from '@/lib/admin/coupon-service';
import { CouponRedeemSchema } from '@/lib/admin/validators';
import { COUPON_ERR } from '@/config/admin-strings';

const REDEEM_WINDOW_MS = 3_600_000; // 1 hour
const REDEEM_MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return unauthorizedResponse();

  const rate = await checkRateLimit(
    `coupon-redeem:${session.user.id}`,
    REDEEM_WINDOW_MS,
    REDEEM_MAX_ATTEMPTS,
  );
  if (!rate.allowed) return apiError(COUPON_ERR.RATE_LIMITED, 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(COUPON_ERR.INVALID_OR_EXPIRED, 400);
  }

  const parsed = CouponRedeemSchema.safeParse(body);
  if (!parsed.success) return apiError(COUPON_ERR.INVALID_OR_EXPIRED, 400);

  const result = await redeemCoupon(parsed.data.code, session.user.id, parsed.data.sessionId);
  if (!result.success) {
    return apiError(COUPON_ERR.INVALID_OR_EXPIRED, 422);
  }
  return apiSuccess({ valid: true });
}
