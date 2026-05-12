/**
 * Phase 2 tests — verify auth callback logic and route protection.
 * Tests use pure functions from callbacks.ts (no next-auth ESM imports).
 */

import { handleJwt, handleSession, isAuthorized, PROTECTED_ROUTES } from '@/lib/auth/callbacks';
import { USER_ROLE, TRACK } from '@/config/strings';

describe('handleJwt callback', () => {
  it('sets role and track from user on login', () => {
    const result = handleJwt(
      { sub: 'user-1' },
      { role: USER_ROLE.ADMIN, track: TRACK.ENTERPRISE, consentAt: '2024-01-01' },
    );

    expect(result.role).toBe(USER_ROLE.ADMIN);
    expect(result.track).toBe(TRACK.ENTERPRISE);
    expect(result.consentAt).toBe('2024-01-01');
  });

  it('defaults to user/hni when user has no role', () => {
    const result = handleJwt({ sub: 'user-2' }, {});
    expect(result.role).toBe(USER_ROLE.USER);
    expect(result.track).toBe(TRACK.HNI);
    expect(result.consentAt).toBeNull();
  });

  it('preserves existing token when no user', () => {
    const token = { sub: 'user-3', role: USER_ROLE.ADMIN, track: TRACK.ENTERPRISE };
    const result = handleJwt(token);
    expect(result).toEqual(token);
  });
});

describe('handleSession callback', () => {
  it('injects id, role, track, consentAt from token', () => {
    const sessionUser = {
      id: '',
      name: 'Test',
      email: 'test@test.com',
      image: null,
      role: '',
      track: '',
      consentAt: null,
    };
    const token = {
      sub: 'user-1',
      role: USER_ROLE.ADMIN,
      track: TRACK.ENTERPRISE,
      consentAt: '2024-01-01',
    };

    const result = handleSession(sessionUser, token);
    expect(result.id).toBe('user-1');
    expect(result.role).toBe(USER_ROLE.ADMIN);
    expect(result.track).toBe(TRACK.ENTERPRISE);
    expect(result.consentAt).toBe('2024-01-01');
  });

  it('defaults missing token fields', () => {
    const sessionUser = {
      id: '',
      name: null,
      email: null,
      image: null,
      role: '',
      track: '',
      consentAt: null,
    };
    const result = handleSession(sessionUser, {});
    expect(result.id).toBe('');
    expect(result.role).toBe(USER_ROLE.USER);
    expect(result.track).toBe(TRACK.HNI);
  });
});

describe('isAuthorized (route protection)', () => {
  it('blocks unauthenticated access to /admin', () => {
    expect(isAuthorized(undefined, false, '/admin/dashboard')).toBe(false);
  });

  it('blocks non-admin user from /admin', () => {
    expect(isAuthorized(USER_ROLE.USER, true, '/admin/dashboard')).toBe(false);
  });

  it('allows admin access to /admin', () => {
    expect(isAuthorized(USER_ROLE.ADMIN, true, '/admin/dashboard')).toBe(true);
  });

  it('blocks unauthenticated access to /questionnaire', () => {
    expect(isAuthorized(undefined, false, '/questionnaire/hni')).toBe(false);
  });

  it('allows authenticated user to /questionnaire', () => {
    expect(isAuthorized(USER_ROLE.USER, true, '/questionnaire/hni')).toBe(true);
  });

  it('blocks unauthenticated access to /dashboard', () => {
    expect(isAuthorized(undefined, false, '/dashboard')).toBe(false);
  });

  it('allows authenticated user to /dashboard', () => {
    expect(isAuthorized(USER_ROLE.USER, true, '/dashboard')).toBe(true);
  });

  it('allows public access to landing page', () => {
    expect(isAuthorized(undefined, false, '/')).toBe(true);
  });

  it('allows public access to /auth routes', () => {
    expect(isAuthorized(undefined, false, '/auth/signin')).toBe(true);
  });
});

describe('PROTECTED_ROUTES config', () => {
  it('protects /admin routes', () => {
    expect(PROTECTED_ROUTES).toContainEqual('/admin/:path*');
  });

  it('protects /questionnaire routes', () => {
    expect(PROTECTED_ROUTES).toContainEqual('/questionnaire/:path*');
  });

  it('protects /dashboard routes', () => {
    expect(PROTECTED_ROUTES).toContainEqual('/dashboard/:path*');
  });

  it('does NOT protect root or auth routes', () => {
    const hasRoot = PROTECTED_ROUTES.some((r) => r === '/');
    const hasAuth = PROTECTED_ROUTES.some((r) => r.includes('auth'));
    expect(hasRoot).toBe(false);
    expect(hasAuth).toBe(false);
  });
});
