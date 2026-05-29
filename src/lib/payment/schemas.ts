/**
 * Zod schemas for payment API inputs.
 * Replaces unsafe `body as Record<string, unknown>` casts.
 */

import { z } from 'zod';
import { VALIDATION_ERR } from '@/config/strings';

export const CreateOrderSchema = z.object({
  report_id: z.string().min(1, VALIDATION_ERR.REQUIRED_REPORT_ID),
});

export const VerifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, VALIDATION_ERR.REQUIRED_ORDER_ID),
  razorpay_payment_id: z.string().min(1, VALIDATION_ERR.REQUIRED_PAYMENT_ID),
  razorpay_signature: z.string().min(1, VALIDATION_ERR.REQUIRED_SIGNATURE),
});

export const EnterpriseProposalSchema = z.object({
  companyName: z.string().trim().min(1, VALIDATION_ERR.REQUIRED_COMPANY_NAME),
  contactName: z.string().trim().min(1, VALIDATION_ERR.REQUIRED_CONTACT_NAME),
  contactEmail: z.string().trim().email(VALIDATION_ERR.REQUIRED_EMAIL),
  contactPhone: z.string().trim().optional(),
  facilityCount: z.number().int().min(1),
  reportId: z.string().trim().min(1, VALIDATION_ERR.REQUIRED_REPORT_ID),
  notes: z.string().trim().optional(),
  captchaToken: z.string().optional(),
});
