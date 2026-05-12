/**
 * Auth callback logic — pure functions, testable in isolation.
 * No next-auth imports here; these are injected into the NextAuth config.
 */

import { USER_ROLE, TRACK } from '@/config/strings';

export interface AuthUser {
  role?: string;
  track?: string;
  consentAt?: string | null;
}

export interface JWTToken {
  [key: string]: unknown;
  sub?: string;
  role?: string;
  track?: string;
  consentAt?: string | null;
}

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: string;
  track: string;
  consentAt: string | null;
}

export function handleJwt(token: JWTToken, user?: AuthUser): JWTToken {
  if (user) {
    return {
      ...token,
      role: user.role ?? USER_ROLE.USER,
      track: user.track ?? TRACK.HNI,
      consentAt: user.consentAt ?? null,
    };
  }
  return token;
}

export function handleSession(sessionUser: SessionUser, token: JWTToken): SessionUser {
  return {
    ...sessionUser,
    id: token.sub ?? '',
    role: (token.role as string) ?? USER_ROLE.USER,
    track: (token.track as string) ?? TRACK.HNI,
    consentAt: (token.consentAt as string | null) ?? null,
  };
}

export function isAuthorized(
  userRole: string | undefined,
  isLoggedIn: boolean,
  pathname: string,
): boolean {
  if (pathname.startsWith('/admin')) {
    return isLoggedIn && userRole === USER_ROLE.ADMIN;
  }
  if (pathname.startsWith('/questionnaire') || pathname.startsWith('/dashboard')) {
    return isLoggedIn;
  }
  return true;
}

export const PROTECTED_ROUTES = ['/admin/:path*', '/questionnaire/:path*', '/dashboard/:path*'];
