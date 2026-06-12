/**
 * Phase 2 tests — phone field on user profile.
 * Covers normalizePhone SSOT, PATCH /api/user/profile phone handling,
 * and the follow-up service carrying userPhone through to WhatsApp URLs.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { normalizePhone } from '@/lib/phone';

describe('normalizePhone', () => {
  it('accepts E.164 with + and strips it', () => {
    expect(normalizePhone('+919876543210')).toBe('919876543210');
  });

  it('strips spaces, dashes, and parentheses', () => {
    expect(normalizePhone('+91 98765-43210')).toBe('919876543210');
    expect(normalizePhone('(971) 50 123 4567')).toBe('971501234567');
  });

  it('accepts digits-only input', () => {
    expect(normalizePhone('919876543210')).toBe('919876543210');
  });

  it('rejects numbers with a leading zero', () => {
    expect(normalizePhone('0987654321')).toBeNull();
  });

  it('rejects too-short and too-long numbers', () => {
    expect(normalizePhone('1234567')).toBeNull(); // 7 digits
    expect(normalizePhone('1234567890123456')).toBeNull(); // 16 digits
  });

  it('rejects letters and garbage', () => {
    expect(normalizePhone('not-a-phone')).toBeNull();
    expect(normalizePhone('98765abc43')).toBeNull();
  });
});

describe('PATCH /api/user/profile — phone field', () => {
  const mockUpdate = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    mockUpdate.mockReset();
    jest.mock('@/lib/api', () => ({
      requireAuth: jest.fn().mockResolvedValue({ user: { id: 'user-1' } }),
      unauthorizedResponse: () =>
        new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
      apiSuccess: (data: unknown) => new Response(JSON.stringify({ data }), { status: 200 }),
      apiError: (msg: string, code: number) =>
        new Response(JSON.stringify({ error: msg }), { status: code }),
    }));
    jest.mock('@/lib/prisma', () => ({
      prisma: { user: { update: mockUpdate } },
    }));
  });

  function makeRequest(body: unknown): Request {
    return new Request('http://localhost/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('stores a normalized phone number', async () => {
    mockUpdate.mockResolvedValue({ city: null, country: null, phone: '919876543210' });
    const { PATCH } = await import('@/app/api/user/profile/route');

    const res = await PATCH(makeRequest({ phone: '+91 98765 43210' }) as any);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { phone: '919876543210' },
      }),
    );
  });

  it('returns 422 for an invalid phone and does not write', async () => {
    const { PATCH } = await import('@/app/api/user/profile/route');

    const res = await PATCH(makeRequest({ phone: 'not-a-phone' }) as any);
    expect(res.status).toBe(422);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('clears the phone when an empty string is sent', async () => {
    mockUpdate.mockResolvedValue({ city: null, country: null, phone: null });
    const { PATCH } = await import('@/app/api/user/profile/route');

    const res = await PATCH(makeRequest({ phone: '' }) as any);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { phone: null } }));
  });

  it('still accepts city/country without phone (regression)', async () => {
    mockUpdate.mockResolvedValue({ city: 'Mumbai', country: 'India', phone: null });
    const { PATCH } = await import('@/app/api/user/profile/route');

    const res = await PATCH(makeRequest({ city: 'Mumbai', country: 'India' }) as any);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { city: 'Mumbai', country: 'India' } }),
    );
  });
});

describe('followup-service — userPhone in follow-up items', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('carries user.phone through getFollowUpList as userPhone', async () => {
    const followupDue = new Date(Date.now() + 3 * 86_400_000);
    jest.mock('@/lib/prisma', () => ({
      prisma: {
        auditSession: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'sess-1',
              userId: 'user-1',
              downloadedAt: new Date(),
              postDownloadFollowupAt: followupDue,
              track: 'hni',
              user: { name: 'Test', email: 't@example.com', phone: '919876543210' },
            },
            {
              id: 'sess-2',
              userId: 'user-2',
              downloadedAt: new Date(),
              postDownloadFollowupAt: followupDue,
              track: 'hni',
              user: { name: 'NoPhone', email: 'n@example.com', phone: null },
            },
          ]),
        },
      },
    }));

    const { getFollowUpList } = await import('@/lib/admin/followup-service');
    const items = await getFollowUpList();

    expect(items[0].userPhone).toBe('919876543210');
    expect(items[1].userPhone).toBeNull();
  });

  it('buildWhatsAppUrl targets the phone number directly', async () => {
    const { buildWhatsAppUrl } = await import('@/lib/admin/followup-service');
    const url = buildWhatsAppUrl('919876543210');
    expect(url.startsWith('https://wa.me/919876543210?text=')).toBe(true);
  });
});
