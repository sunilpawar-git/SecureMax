/**
 * @jest-environment jsdom
 *
 * Phase 3 tests — CouponRedemptionWidget on the payment page.
 * Apply calls /api/coupon/redeem; success shows unlocked state + View Report;
 * failure shows the generic error and keeps the form usable.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CouponRedemptionWidget } from '@/app/(app)/payment/[sessionId]/_components/CouponRedemptionWidget';
import { PAYMENT_COUPON } from '@/config/strings';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

beforeEach(() => {
  jest.clearAllMocks();
});

async function openCouponForm() {
  const user = userEvent.setup();
  render(<CouponRedemptionWidget sessionId="sess-1" onRedeemed={jest.fn()} />);
  await user.click(screen.getByRole('button', { name: PAYMENT_COUPON.TOGGLE }));
  return user;
}

describe('CouponRedemptionWidget', () => {
  it('is collapsed behind a toggle by default', () => {
    render(<CouponRedemptionWidget sessionId="sess-1" onRedeemed={jest.fn()} />);
    expect(screen.getByRole('button', { name: PAYMENT_COUPON.TOGGLE })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(PAYMENT_COUPON.PLACEHOLDER)).not.toBeInTheDocument();
  });

  it('applies a valid code: calls API, shows success + View Report CTA', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ valid: true }) });
    const onRedeemed = jest.fn();
    const user = userEvent.setup();
    render(<CouponRedemptionWidget sessionId="sess-1" onRedeemed={onRedeemed} />);

    await user.click(screen.getByRole('button', { name: PAYMENT_COUPON.TOGGLE }));
    await user.type(screen.getByPlaceholderText(PAYMENT_COUPON.PLACEHOLDER), 'abcd2345');
    await user.click(screen.getByRole('button', { name: PAYMENT_COUPON.APPLY }));

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/coupon/redeem',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ code: 'ABCD2345', sessionId: 'sess-1' }),
      }),
    );
    expect(await screen.findByText(PAYMENT_COUPON.SUCCESS)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: PAYMENT_COUPON.VIEW_REPORT })).toBeInTheDocument();
    expect(onRedeemed).toHaveBeenCalled();
  });

  it('View Report navigates to the report download page', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ valid: true }) });
    const user = await openCouponForm();

    await user.type(screen.getByPlaceholderText(PAYMENT_COUPON.PLACEHOLDER), 'ABCD2345');
    await user.click(screen.getByRole('button', { name: PAYMENT_COUPON.APPLY }));
    await user.click(await screen.findByRole('button', { name: PAYMENT_COUPON.VIEW_REPORT }));

    expect(mockPush).toHaveBeenCalledWith('/report/sess-1/download');
  });

  it('shows the error message on failed redemption and keeps the form', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid or expired code' }),
    });
    const user = await openCouponForm();

    await user.type(screen.getByPlaceholderText(PAYMENT_COUPON.PLACEHOLDER), 'WRONG999');
    await user.click(screen.getByRole('button', { name: PAYMENT_COUPON.APPLY }));

    expect(await screen.findByText('Invalid or expired code')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(PAYMENT_COUPON.PLACEHOLDER)).toBeInTheDocument();
  });

  it('uppercases input as the user types', async () => {
    const user = await openCouponForm();
    const input = screen.getByPlaceholderText<HTMLInputElement>(PAYMENT_COUPON.PLACEHOLDER);
    await user.type(input, 'abcd');
    expect(input.value).toBe('ABCD');
  });
});
