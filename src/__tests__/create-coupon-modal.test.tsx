/**
 * @jest-environment jsdom
 *
 * CreateCouponModal — success state UX.
 * After a coupon is created the modal must say the coupon is live and the
 * close button must read "Done" (not "Cancel"); the form view keeps Cancel.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateCouponModal } from '@/app/admin/coupons/_components/CreateCouponModal';
import { COUPON_STRINGS } from '@/config/admin-strings';

describe('CreateCouponModal', () => {
  it('shows Cancel on the form view before submission', () => {
    render(<CreateCouponModal mode="single" onClose={jest.fn()} onCreate={jest.fn()} />);
    expect(screen.getByRole('button', { name: COUPON_STRINGS.CANCEL })).toBeInTheDocument();
    expect(screen.queryByText(COUPON_STRINGS.CREATED_LIVE)).not.toBeInTheDocument();
  });

  it('shows the live message and a Done button after successful creation', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onCreate = jest.fn().mockResolvedValue(['GYBUA7FD']);
    render(<CreateCouponModal mode="single" onClose={onClose} onCreate={onCreate} />);

    await user.click(screen.getByRole('button', { name: COUPON_STRINGS.SUBMIT_CREATE }));

    await waitFor(() => expect(screen.getByText('GYBUA7FD')).toBeInTheDocument());
    expect(screen.getByText(COUPON_STRINGS.CREATED_LIVE)).toBeInTheDocument();

    const done = screen.getByRole('button', { name: COUPON_STRINGS.DONE });
    expect(done).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: COUPON_STRINGS.CANCEL })).not.toBeInTheDocument();

    await user.click(done);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the bulk live message wording for bulk mode', async () => {
    const user = userEvent.setup();
    const onCreate = jest.fn().mockResolvedValue(['CODE0001', 'CODE0002']);
    render(<CreateCouponModal mode="bulk" onClose={jest.fn()} onCreate={onCreate} />);

    await user.click(screen.getByRole('button', { name: COUPON_STRINGS.SUBMIT_BULK }));

    await waitFor(() => expect(screen.getByText('CODE0001')).toBeInTheDocument());
    expect(screen.getByText(COUPON_STRINGS.CREATED_LIVE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: COUPON_STRINGS.DONE })).toBeInTheDocument();
  });
});
