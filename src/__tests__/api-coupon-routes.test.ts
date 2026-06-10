/**
 * Phase 3 tests — coupon API route contracts.
 * POST /api/coupon/redeem: auth, rate limit, generic errors.
 * /api/admin/coupons: admin gate, create modes, revoke.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const mockRedeemCoupon = jest.fn();
const mockCheckRateLimit = jest.fn();
const mockRequireAuth = jest.fn();
const mockVerifyAdmin = jest.fn();
const mockCreateSingle = jest.fn();
const mockCreateBulk = jest.fn();
const mockListCoupons = jest.fn();
const mockRevokeCoupon = jest.fn();

jest.mock('@/lib/api', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  apiSuccess: (data: unknown, status = 200) => new Response(JSON.stringify(data), { status }),
  apiError: (msg: string, status = 400) => new Response(JSON.stringify({ error: msg }), { status }),
}));

jest.mock('@/lib/admin/auth', () => ({
  verifyAdmin: (...args: unknown[]) => mockVerifyAdmin(...args),
  forbiddenResponse: () => new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
}));

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

jest.mock('@/lib/admin/coupon-service', () => ({
  redeemCoupon: (...args: unknown[]) => mockRedeemCoupon(...args),
  createSingleCoupon: (...args: unknown[]) => mockCreateSingle(...args),
  createBulkCoupons: (...args: unknown[]) => mockCreateBulk(...args),
  listCoupons: (...args: unknown[]) => mockListCoupons(...args),
  revokeCoupon: (...args: unknown[]) => mockRevokeCoupon(...args),
  couponsToCsv: () => 'code,status,note,created_at',
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

function makeRequest(url: string, init?: RequestInit): any {
  const req = new Request(url, init) as any;
  req.nextUrl = new URL(url);
  return req;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } });
  mockVerifyAdmin.mockResolvedValue({ user: { id: 'admin-1' } });
  mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 4, resetMs: 0 });
});

describe('POST /api/coupon/redeem', () => {
  async function callRedeem(body: unknown) {
    const { POST } = await import('@/app/api/coupon/redeem/route');
    return POST(
      makeRequest('http://localhost/api/coupon/redeem', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );
  }

  it('redeems a valid code for the authenticated user', async () => {
    mockRedeemCoupon.mockResolvedValue({ success: true });
    const res = await callRedeem({ code: 'ABCD2345', sessionId: 'sess-1' });
    expect(res.status).toBe(200);
    expect(mockRedeemCoupon).toHaveBeenCalledWith('ABCD2345', 'user-1', 'sess-1');
  });

  it('returns 401 when unauthenticated', async () => {
    mockRequireAuth.mockResolvedValue(null);
    const res = await callRedeem({ code: 'ABCD2345', sessionId: 'sess-1' });
    expect(res.status).toBe(401);
    expect(mockRedeemCoupon).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limit is exhausted', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetMs: 1000 });
    const res = await callRedeem({ code: 'ABCD2345', sessionId: 'sess-1' });
    expect(res.status).toBe(429);
    expect(mockRedeemCoupon).not.toHaveBeenCalled();
  });

  it('rate limit key is scoped per user', async () => {
    mockRedeemCoupon.mockResolvedValue({ success: true });
    await callRedeem({ code: 'ABCD2345', sessionId: 'sess-1' });
    expect(mockCheckRateLimit).toHaveBeenCalledWith('coupon-redeem:user-1', 3_600_000, 5);
  });

  it('returns the generic 422 error on failed redemption', async () => {
    mockRedeemCoupon.mockResolvedValue({ success: false, error: 'Invalid or expired code' });
    const res = await callRedeem({ code: 'USED1234', sessionId: 'sess-1' });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe('Invalid or expired code');
  });

  it('rejects malformed codes without hitting the service', async () => {
    const res = await callRedeem({ code: 'bad code!', sessionId: 'sess-1' });
    expect(res.status).toBe(400);
    expect(mockRedeemCoupon).not.toHaveBeenCalled();
  });
});

describe('/api/admin/coupons', () => {
  async function callPost(body: unknown) {
    const { POST } = await import('@/app/api/admin/coupons/route');
    return POST(
      makeRequest('http://localhost/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );
  }

  it('GET returns 403 for non-admin', async () => {
    mockVerifyAdmin.mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/coupons/route');
    const res = await GET(makeRequest('http://localhost/api/admin/coupons'));
    expect(res.status).toBe(403);
  });

  it('GET lists coupons with status filter', async () => {
    mockListCoupons.mockResolvedValue({ coupons: [], total: 0, page: 1, limit: 50 });
    const { GET } = await import('@/app/api/admin/coupons/route');
    const res = await GET(makeRequest('http://localhost/api/admin/coupons?status=active'));
    expect(res.status).toBe(200);
    expect(mockListCoupons).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
  });

  it('POST single creates one coupon', async () => {
    mockCreateSingle.mockResolvedValue({ id: 'c1', code: 'ABCD2345' });
    const res = await callPost({ mode: 'single', note: 'pilot' });
    expect(res.status).toBe(201);
    expect(mockCreateSingle).toHaveBeenCalledWith('admin-1', 'pilot', undefined);
  });

  it('POST bulk creates N coupons', async () => {
    mockCreateBulk.mockResolvedValue([
      { id: 'c1', code: 'AAAA2222' },
      { id: 'c2', code: 'BBBB3333' },
    ]);
    const res = await callPost({ mode: 'bulk', count: 2 });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.coupons).toHaveLength(2);
  });

  it('POST bulk without count is rejected', async () => {
    const res = await callPost({ mode: 'bulk' });
    expect(res.status).toBe(400);
    expect(mockCreateBulk).not.toHaveBeenCalled();
  });

  it('POST bulk above 500 is rejected by validation', async () => {
    const res = await callPost({ mode: 'bulk', count: 501 });
    expect(res.status).toBe(400);
    expect(mockCreateBulk).not.toHaveBeenCalled();
  });

  it('DELETE revokes a coupon as admin', async () => {
    mockRevokeCoupon.mockResolvedValue({ success: true });
    const { DELETE } = await import('@/app/api/admin/coupons/[code]/route');
    const res = await DELETE(
      makeRequest('http://localhost/api/admin/coupons/ABCD2345', { method: 'DELETE' }),
      { params: Promise.resolve({ code: 'ABCD2345' }) },
    );
    expect(res.status).toBe(200);
    expect(mockRevokeCoupon).toHaveBeenCalledWith('ABCD2345', 'admin-1');
  });

  it('DELETE returns 403 for non-admin', async () => {
    mockVerifyAdmin.mockResolvedValue(null);
    const { DELETE } = await import('@/app/api/admin/coupons/[code]/route');
    const res = await DELETE(
      makeRequest('http://localhost/api/admin/coupons/ABCD2345', { method: 'DELETE' }),
      { params: Promise.resolve({ code: 'ABCD2345' }) },
    );
    expect(res.status).toBe(403);
    expect(mockRevokeCoupon).not.toHaveBeenCalled();
  });
});
