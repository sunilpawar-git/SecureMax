/**
 * Unit tests for useUsersData hook helpers.
 * React state interaction tests require @testing-library/react (not yet installed).
 * buildUsersParams is extracted and tested independently in node environment.
 */

import { buildUsersParams } from '@/app/admin/users/_hooks/useUsersData';

describe('buildUsersParams', () => {
  it('includes page and limit always', () => {
    const qs = buildUsersParams({ track: '', search: '', page: 1, limit: 50 });
    expect(qs).toContain('page=1');
    expect(qs).toContain('limit=50');
  });

  it('includes track when non-empty', () => {
    const qs = buildUsersParams({ track: 'enterprise', search: '', page: 1, limit: 50 });
    expect(qs).toContain('track=enterprise');
  });

  it('omits track when empty string', () => {
    const qs = buildUsersParams({ track: '', search: '', page: 1, limit: 50 });
    expect(qs).not.toContain('track');
  });

  it('includes search when non-empty', () => {
    const qs = buildUsersParams({ track: '', search: 'alice', page: 1, limit: 50 });
    expect(qs).toContain('search=alice');
  });

  it('omits search when empty string', () => {
    const qs = buildUsersParams({ track: '', search: '', page: 1, limit: 50 });
    expect(qs).not.toContain('search');
  });

  it('includes both track and search when both provided', () => {
    const qs = buildUsersParams({ track: 'hni', search: 'bob', page: 2, limit: 10 });
    expect(qs).toContain('track=hni');
    expect(qs).toContain('search=bob');
    expect(qs).toContain('page=2');
    expect(qs).toContain('limit=10');
  });

  it('URL-encodes special characters in search', () => {
    const qs = buildUsersParams({ track: '', search: 'alice@test.com', page: 1, limit: 50 });
    expect(decodeURIComponent(qs)).toContain('search=alice@test.com');
  });
});
