/**
 * Shared admin authentication — single source for verifyAdmin().
 * Replaces duplicated auth checks across admin API routes.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { USER_ROLE } from '@/config/strings';
import { ADMIN_ERR } from '@/config/admin-strings';

export interface AdminSession {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export async function verifyAdmin(): Promise<AdminSession | null> {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== USER_ROLE.ADMIN) {
    return null;
  }
  return session as unknown as AdminSession;
}

/** Returns a fresh 403 response on every call — never reuses a shared instance. */
export function forbiddenResponse(): NextResponse {
  return NextResponse.json({ error: ADMIN_ERR.FORBIDDEN }, { status: 403 });
}
