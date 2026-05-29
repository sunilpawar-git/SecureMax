/**
 * Shared authentication guards for API routes.
 * Single source of truth — replaces duplicated auth() + null checks.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { verifyAdmin, forbiddenResponse as adminForbiddenResponse } from '@/lib/admin/auth';

export interface AuthenticatedSession {
  user: {
    id: string;
    email: string | null;
    role: string;
    track: string;
    consentAt: string | null;
  };
}

export async function requireAuth(): Promise<AuthenticatedSession | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session as AuthenticatedSession;
}

export async function requireAdmin(): Promise<AuthenticatedSession | null> {
  const adminSession = await verifyAdmin();
  if (!adminSession) return null;
  return adminSession as AuthenticatedSession;
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

/** Re-exports the canonical 403 response from admin/auth to avoid dual definitions. */
export const forbiddenResponse = adminForbiddenResponse;
