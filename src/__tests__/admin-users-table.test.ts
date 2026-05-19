/**
 * Unit tests for UsersTable pure helpers — date formatting functions.
 * React rendering tests require @testing-library/react (not yet installed).
 */

import { formatRelativeDate, formatShortDate } from '@/app/admin/users/_components/UsersTable';
import { USERS_PAGE } from '@/config/admin-strings';

const FROZEN_NOW = new Date('2026-05-19T12:00:00.000Z');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FROZEN_NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('formatRelativeDate', () => {
  it('returns the never label for null input', () => {
    expect(formatRelativeDate(null, USERS_PAGE.NEVER)).toBe(USERS_PAGE.NEVER);
  });

  it('returns "Today" for a timestamp from earlier today', () => {
    const todayIso = new Date(FROZEN_NOW.getTime() - 3_600_000).toISOString(); // 1 hour ago
    expect(formatRelativeDate(todayIso, USERS_PAGE.NEVER)).toBe('Today');
  });

  it('returns "1 day ago" for a timestamp exactly 24h ago', () => {
    const yesterday = new Date(FROZEN_NOW.getTime() - 86_400_000).toISOString();
    expect(formatRelativeDate(yesterday, USERS_PAGE.NEVER)).toBe('1 day ago');
  });

  it('returns "X days ago" for older timestamps', () => {
    const fiveDaysAgo = new Date(FROZEN_NOW.getTime() - 5 * 86_400_000).toISOString();
    expect(formatRelativeDate(fiveDaysAgo, USERS_PAGE.NEVER)).toBe('5 days ago');
  });

  it('returns "Today" for a future timestamp (clock skew / future date)', () => {
    const tomorrow = new Date(FROZEN_NOW.getTime() + 86_400_000).toISOString();
    expect(formatRelativeDate(tomorrow, USERS_PAGE.NEVER)).toBe('Today');
  });

  it('uses the provided never label, not a hardcoded string', () => {
    expect(formatRelativeDate(null, 'Inactive')).toBe('Inactive');
  });
});

describe('formatShortDate', () => {
  it('formats a midnight UTC date as DD/MM/YYYY', () => {
    expect(formatShortDate('2026-01-15T00:00:00.000Z')).toBe('15/01/2026');
  });

  it('zero-pads single-digit day and month', () => {
    expect(formatShortDate('2026-03-05T00:00:00.000Z')).toBe('05/03/2026');
  });

  it('handles end-of-year midnight UTC correctly', () => {
    expect(formatShortDate('2025-12-31T23:59:59.000Z')).toBe('31/12/2025');
  });

  it('ignores time-of-day component (non-midnight UTC timestamp)', () => {
    expect(formatShortDate('2026-01-15T14:30:45.000Z')).toBe('15/01/2026');
  });
});
