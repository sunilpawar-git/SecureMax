/**
 * @jest-environment jsdom
 *
 * Phase 11C — admin idle logout.
 * Intent: warning appears WARN_BEFORE_MS before the deadline, signOut fires
 * at TIMEOUT_MS of inactivity, and any user activity resets both timers.
 */

import { render, screen, act, fireEvent } from '@testing-library/react';
import { IdleLogout } from '@/app/admin/_components/IdleLogout';
import { ADMIN_IDLE } from '@/config/admin-strings';

const mockSignOut = jest.fn();
jest.mock('next-auth/react', () => ({
  signOut: (...a: unknown[]) => mockSignOut(...a),
}));

const WARN_AT = ADMIN_IDLE.TIMEOUT_MS - ADMIN_IDLE.WARN_BEFORE_MS;

beforeEach(() => {
  jest.useFakeTimers();
  mockSignOut.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('IdleLogout', () => {
  it('renders nothing while the admin is active', () => {
    render(<IdleLogout />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the warning banner 2 minutes before timeout', () => {
    render(<IdleLogout />);
    act(() => jest.advanceTimersByTime(WARN_AT));
    expect(screen.getByRole('alert')).toHaveTextContent(ADMIN_IDLE.WARNING_MESSAGE);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('signs the admin out after the full idle timeout', () => {
    render(<IdleLogout />);
    act(() => jest.advanceTimersByTime(ADMIN_IDLE.TIMEOUT_MS));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('resets the timers on user activity — no warning, no sign-out', () => {
    render(<IdleLogout />);
    // Stay just under the warning threshold, then be active.
    act(() => jest.advanceTimersByTime(WARN_AT - 1000));
    act(() => {
      fireEvent.keyDown(window);
    });
    // The original deadline passes without warning or sign-out.
    act(() => jest.advanceTimersByTime(WARN_AT - 1000));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('"Stay signed in" dismisses the warning and restarts the clock', () => {
    render(<IdleLogout />);
    act(() => jest.advanceTimersByTime(WARN_AT));
    fireEvent.click(screen.getByText(ADMIN_IDLE.STAY_SIGNED_IN));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // Original logout deadline passes harmlessly.
    act(() => jest.advanceTimersByTime(ADMIN_IDLE.WARN_BEFORE_MS));
    expect(mockSignOut).not.toHaveBeenCalled();
    // But a fresh full timeout still signs out.
    act(() => jest.advanceTimersByTime(ADMIN_IDLE.TIMEOUT_MS));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
