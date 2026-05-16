/**
 * Zod schemas for payment API inputs.
 * Replaces unsafe `body as Record<string, unknown>` casts.
 */

import { z } from 'zod';

export const CreateOrderSchema = z.object({
  report_id: z.string().min(1, 'report_id is required'),
});

export const VerifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, 'razorpay_order_id is required'),
  razorpay_payment_id: z.string().min(1, 'razorpay_payment_id is required'),
  razorpay_signature: z.string().min(1, 'razorpay_signature is required'),
});

export const EnterpriseProposalSchema = z.object({
  companyName: z.string().trim().min(1, 'Company name is required'),
  contactName: z.string().trim().min(1, 'Contact name is required'),
  contactEmail: z.string().trim().email('Valid email is required'),
  contactPhone: z.string().trim().optional(),
  facilityCount: z.number().int().min(1),
  reportId: z.string().trim().min(1, 'Report ID is required'),
  notes: z.string().trim().optional(),
});
