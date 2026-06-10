/**
 * PATCH /api/user/profile — update user profile fields (city, country, phone).
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth, unauthorizedResponse, apiSuccess, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/phone';

const ProfileUpdateSchema = z.object({
  city: z.string().min(1).max(100).optional(),
  country: z.string().min(1).max(100).optional(),
  phone: z.string().max(25).optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return unauthorizedResponse();

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('Invalid request body', 400);
  }

  const parsed = ProfileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError('Invalid profile data', 400);
  }

  const { city, country, phone } = parsed.data;
  if (!city && !country && phone === undefined) {
    return apiError('At least one field (city, country, or phone) required', 400);
  }

  // Empty string clears the phone; non-empty must normalize to valid E.164 digits
  let normalizedPhone: string | null | undefined;
  if (phone !== undefined) {
    if (phone.trim() === '') {
      normalizedPhone = null;
    } else {
      normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return apiError('Invalid phone number', 422);
      }
    }
  }

  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(city && { city }),
        ...(country && { country }),
        ...(normalizedPhone !== undefined && { phone: normalizedPhone }),
      },
      select: { city: true, country: true, phone: true },
    });
    return apiSuccess(updated);
  } catch {
    return apiError('Failed to update profile', 500);
  }
}
