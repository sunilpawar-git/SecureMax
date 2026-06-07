/**
 * PATCH /api/user/profile — update user profile fields (city, country).
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth, unauthorizedResponse, apiSuccess, apiError } from '@/lib/api';
import { prisma } from '@/lib/prisma';

const ProfileUpdateSchema = z.object({
  city: z.string().min(1).max(100).optional(),
  country: z.string().min(1).max(100).optional(),
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

  const { city, country } = parsed.data;
  if (!city && !country) {
    return apiError('At least one field (city or country) required', 400);
  }

  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(city && { city }),
        ...(country && { country }),
      },
      select: { city: true, country: true },
    });
    return apiSuccess(updated);
  } catch {
    return apiError('Failed to update profile', 500);
  }
}
