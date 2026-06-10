/**
 * Admin coupon revocation — DELETE /api/admin/coupons/[code].
 */

import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin/auth';
import { revokeCoupon } from '@/lib/admin/coupon-service';
import { COUPON_ERR, COUPON_STRINGS } from '@/config/admin-strings';
import { logger } from '@/lib/logger';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await verifyAdmin();
  if (!session) return forbiddenResponse();

  const { code } = await params;
  if (!code || !/^[A-Za-z0-9]{4,20}$/.test(code)) {
    return apiError(COUPON_ERR.NOT_FOUND, 404);
  }

  try {
    const result = await revokeCoupon(code, session.user.id);
    if (!result.success) {
      const status = result.error === COUPON_ERR.NOT_FOUND ? 404 : 422;
      return apiError(result.error ?? COUPON_STRINGS.ERR_REVOKE, status);
    }
    return apiSuccess({ revoked: true });
  } catch (err) {
    logger.error('Revoke failed', 'admin-coupons', { detail: String(err) });
    return apiError(COUPON_STRINGS.ERR_REVOKE, 500);
  }
}
