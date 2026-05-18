/**
 * Phase 0.1 — Shared API helpers (guards, response, validation).
 * TDD: Tests written BEFORE implementation.
 *
 * These helpers eliminate duplicated auth checks, inconsistent error shapes,
 * and untyped request bodies across all API routes.
 */

import { z } from 'zod';

// Will be implemented in src/lib/api/guards.ts
import { requireAuth, requireAdmin, unauthorizedResponse } from '@/lib/api/guards';
// Will be implemented in src/lib/api/response.ts
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';
// Will be implemented in src/lib/api/validate.ts
import { parseBody } from '@/lib/api/validate';

// ─── Mock auth ─────────────────────────────────────────────────────────────────

const mockAdminSession = {
  user: { id: 'admin-1', email: 'admin@raivan.com', role: 'admin', track: 'hni', consentAt: '2026-01-01' },
};

const mockUserSession = {
  user: { id: 'user-1', email: 'user@test.com', role: 'user', track: 'hni', consentAt: '2026-01-01' },
};

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';
const mockAuth = auth as unknown as jest.Mock;

// ─── Guards ────────────────────────────────────────────────────────────────────

describe('requireAuth', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns session when user is authenticated', async () => {
    mockAuth.mockResolvedValue(mockUserSession);
    const result = await requireAuth();
    expect(result).not.toBeNull();
    expect(result!.user.id).toBe('user-1');
  });

  it('returns null when no session exists', async () => {
    mockAuth.mockResolvedValue(null);
    const result = await requireAuth();
    expect(result).toBeNull();
  });

  it('returns null when session has no user', async () => {
    mockAuth.mockResolvedValue({});
    const result = await requireAuth();
    expect(result).toBeNull();
  });

  it('returns null when user has no id', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } });
    const result = await requireAuth();
    expect(result).toBeNull();
  });
});

describe('requireAdmin', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns session when user is admin', async () => {
    mockAuth.mockResolvedValue(mockAdminSession);
    const result = await requireAdmin();
    expect(result).not.toBeNull();
    expect(result!.user.role).toBe('admin');
  });

  it('returns null when user is not admin', async () => {
    mockAuth.mockResolvedValue(mockUserSession);
    const result = await requireAdmin();
    expect(result).toBeNull();
  });

  it('returns null when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const result = await requireAdmin();
    expect(result).toBeNull();
  });
});

describe('unauthorizedResponse', () => {
  it('returns 401 with structured error', () => {
    const res = unauthorizedResponse();
    expect(res.status).toBe(401);
  });

  it('returns JSON with error field', async () => {
    const res = unauthorizedResponse();
    const body = await res.json();
    expect(body.error).toBe('Authentication required');
  });
});

// ─── Response helpers ──────────────────────────────────────────────────────────

describe('apiSuccess', () => {
  it('returns 200 by default', () => {
    const res = apiSuccess({ id: '123' });
    expect(res.status).toBe(200);
  });

  it('accepts custom status code', () => {
    const res = apiSuccess({ created: true }, 201);
    expect(res.status).toBe(201);
  });

  it('body matches provided data', async () => {
    const data = { name: 'Test', count: 5 };
    const res = apiSuccess(data);
    const body = await res.json();
    expect(body).toEqual(data);
  });
});

describe('apiError', () => {
  it('returns specified status code', () => {
    const res = apiError('Not found', 404);
    expect(res.status).toBe(404);
  });

  it('body has error field with message', async () => {
    const res = apiError('Something went wrong', 500);
    const body = await res.json();
    expect(body.error).toBe('Something went wrong');
  });

  it('defaults to 400 when no status given', () => {
    const res = apiError('Bad request');
    expect(res.status).toBe(400);
  });
});

describe('apiValidationError', () => {
  it('returns 422 status', () => {
    const res = apiValidationError([{ field: 'email', message: 'Invalid email' }]);
    expect(res.status).toBe(422);
  });

  it('body contains validation_errors array', async () => {
    const errors = [
      { field: 'email', message: 'Required' },
      { field: 'name', message: 'Too short' },
    ];
    const res = apiValidationError(errors);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
    expect(body.validation_errors).toEqual(errors);
  });
});

// ─── Body validation ───────────────────────────────────────────────────────────

const TestSchema = z.object({
  name: z.string().min(1),
  count: z.number().int().positive(),
});

describe('parseBody', () => {
  function makeRequest(body: unknown): Request {
    return new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns parsed data for valid body', async () => {
    const req = makeRequest({ name: 'Widget', count: 3 });
    const result = await parseBody(req, TestSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Widget');
      expect(result.data.count).toBe(3);
    }
  });

  it('returns error for invalid body', async () => {
    const req = makeRequest({ name: '', count: -1 });
    const result = await parseBody(req, TestSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toHaveProperty('field');
      expect(result.errors[0]).toHaveProperty('message');
    }
  });

  it('returns error for non-JSON body', async () => {
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
      body: 'not json',
    });
    const result = await parseBody(req, TestSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].field).toBe('body');
    }
  });

  it('returns error for empty body', async () => {
    const req = new Request('http://localhost/api/test', {
      method: 'POST',
    });
    const result = await parseBody(req, TestSchema);
    expect(result.success).toBe(false);
  });
});
