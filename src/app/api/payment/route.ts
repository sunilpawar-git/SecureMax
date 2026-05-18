/**
 * Payment API routes — refactored with shared guards, Zod validation,
 * and proper payment persistence.
 *
 * POST /api/payment?action=create-order  — creates RazorPay order (HNI)
 * POST /api/payment?action=verify        — verifies signature + persists paid=true
 * POST /api/payment?action=enterprise-proposal — submits enterprise lead
 */

import { NextRequest } from 'next/server';
import {
  requireAuth,
  unauthorizedResponse,
  apiSuccess,
  apiError,
  apiValidationError,
  parseBody,
} from '@/lib/api';
import { createOrder, verifySignature, getKeyId } from '@/lib/payment/razorpay';
import {
  CreateOrderSchema,
  VerifyPaymentSchema,
  EnterpriseProposalSchema,
} from '@/lib/payment/schemas';
import {
  persistPaymentUnlock,
  isWebhookProcessed,
  logPaymentVerification,
} from '@/lib/payment/payment-service';
import { PAYMENT } from '@/config/strings';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return unauthorizedResponse();

  const action = request.nextUrl.searchParams.get('action');

  const userId = session.user.id;

  switch (action) {
    case 'create-order':
      return handleCreateOrder(request, userId);
    case 'verify':
      return handleVerify(request);
    case 'enterprise-proposal':
      return handleEnterpriseProposal(request);
    default:
      return apiError('Invalid action. Use: create-order, verify, enterprise-proposal');
  }
}

async function handleCreateOrder(request: Request, userId: string) {
  const parsed = await parseBody(request, CreateOrderSchema);
  if (!parsed.success) return apiValidationError(parsed.errors);

  const session = await prisma.auditSession.findFirst({
    where: { id: parsed.data.report_id, userId },
  });
  if (!session) {
    return apiError('Session not found', 404);
  }

  try {
    const order = await createOrder(parsed.data.report_id, PAYMENT.AMOUNT_PAISE);

    await prisma.auditSession.update({
      where: { id: parsed.data.report_id },
      data: { razorpayOrderId: order.id },
    });

    return apiSuccess({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: getKeyId(),
    });
  } catch {
    return apiError('Payment service unavailable', 503);
  }
}

async function handleVerify(request: Request) {
  const parsed = await parseBody(request, VerifyPaymentSchema);
  if (!parsed.success) return apiValidationError(parsed.errors);

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  const alreadyProcessed = await isWebhookProcessed(razorpay_order_id);
  if (alreadyProcessed) {
    return apiSuccess({ verified: true, report_unlocked: true, idempotent: true });
  }

  const isValid = verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature });
  if (!isValid) {
    await logPaymentVerification(
      razorpay_order_id,
      razorpay_payment_id,
      'failed',
      'Invalid signature',
    );
    return apiError('Invalid payment signature', 400);
  }

  const { unlocked } = await persistPaymentUnlock(razorpay_order_id);
  await logPaymentVerification(
    razorpay_order_id,
    razorpay_payment_id,
    unlocked ? 'success' : 'partial_failure',
    unlocked ? undefined : 'Signature valid but no matching session found',
  );

  return apiSuccess({ verified: true, report_unlocked: unlocked });
}

async function handleEnterpriseProposal(request: Request) {
  const parsed = await parseBody(request, EnterpriseProposalSchema);
  if (!parsed.success) return apiValidationError(parsed.errors);

  const { companyName, contactName, contactEmail, contactPhone, facilityCount, reportId } =
    parsed.data;

  try {
    const lead = await prisma.enterpriseLead.create({
      data: {
        name: contactName,
        company: companyName,
        email: contactEmail,
        preferredContact: contactPhone,
        facilitiesCount: facilityCount,
        sourceSessionId: reportId,
        status: 'new',
      },
    });

    return apiSuccess(
      {
        status: 'submitted',
        message: 'Proposal received. Our team will contact you within 24 hours.',
        lead_id: lead.id,
      },
      201,
    );
  } catch {
    return apiError('Failed to submit proposal', 500);
  }
}
