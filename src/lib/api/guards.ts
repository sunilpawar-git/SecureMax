/**
 * Shared authentication guards for API routes.
 * Single source of truth — replaces duplicated auth() + null checks.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { verifyAdmin } from '@/lib/admin/auth';

export interface AuthenticatedSession {
  user: {
    id: string;
    email: string;
    role: string;
    track: string;
    consentAt: string | null;
  };
}

export async function requireAuth(): Promise<AuthenticatedSession | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session as unknown as AuthenticatedSession;
}

export async function requireAdmin(): Promise<AuthenticatedSession | null> {
  const adminSession = await verifyAdmin();
  if (!adminSession) return null;
  return adminSession as unknown as AuthenticatedSession;
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

export function forbiddenResponse(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
