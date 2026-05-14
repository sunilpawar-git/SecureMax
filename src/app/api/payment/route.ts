/**
 * Payment API routes.
 * POST /api/payment?action=create-order — creates RazorPay order (HNI)
 * POST /api/payment?action=verify — verifies payment signature
 * POST /api/payment?action=enterprise-proposal — submits enterprise lead
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createOrder, verifySignature, getKeyId } from '@/lib/payment/razorpay';
import { validateProposal } from '@/lib/payment/enterprise';
import { PAYMENT } from '@/config/strings';
import { logWebhookSuccess, logWebhookFailure } from '@/lib/admin/webhook-service';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const action = request.nextUrl.searchParams.get('action');
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  switch (action) {
    case 'create-order': {
      const reportId = b.report_id;
      if (!reportId) {
        return NextResponse.json({ error: 'report_id required' }, { status: 400 });
      }
      try {
        const order = await createOrder(String(reportId), PAYMENT.AMOUNT_PAISE);
        return NextResponse.json({
          order_id: order.id,
          amount: order.amount,
          currency: order.currency,
          key_id: getKeyId(),
        });
      } catch {
        return NextResponse.json({ error: 'Payment service unavailable' }, { status: 503 });
      }
    }
    case 'verify': {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = b as {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
      };
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
      }
      const isValid = verifySignature({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });
      if (!isValid) {
        await logWebhookFailure('razorpay', 'payment.verify', 'Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
      await logWebhookSuccess('razorpay', 'payment.verify');
      return NextResponse.json({ verified: true, report_unlocked: true });
    }
    case 'enterprise-proposal': {
      const proposal = validateProposal(body);
      if (!proposal) {
        return NextResponse.json(
          {
            error:
              'Invalid proposal data. Required: companyName, contactName, contactEmail, facilityCount, reportId',
          },
          { status: 422 },
        );
      }
      try {
        const lead = await prisma.enterpriseLead.create({
          data: {
            name: proposal.contactName,
            company: proposal.companyName,
            email: proposal.contactEmail,
            facilitiesCount: proposal.facilityCount,
            sourceSessionId: proposal.reportId,
            status: 'new',
          },
        });
        console.info(`[enterprise-lead] created: ${lead.id}`);
        return NextResponse.json({
          status: 'submitted',
          message: 'Proposal received. Our team will contact you within 24 hours.',
          lead_id: lead.id,
        });
      } catch (err) {
        console.error('[enterprise-lead] DB write failed', { detail: String(err) });
        return NextResponse.json({ error: 'Failed to submit proposal' }, { status: 500 });
      }
    }
    default:
      return NextResponse.json(
        { error: 'Invalid action. Use: create-order, verify, enterprise-proposal' },
        { status: 400 },
      );
  }
}
