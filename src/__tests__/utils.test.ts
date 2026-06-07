/**
 * Unit tests for shared pure helpers in src/lib/utils.ts.
 */

import { cx } from '@/lib/utils';

describe('cx', () => {
  it('joins truthy string parts with a single space', () => {
    expect(cx('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out falsy parts (false, null, undefined, empty string)', () => {
    expect(cx('a', false, 'b', null, undefined, '', 'c')).toBe('a b c');
  });

  it('supports conditional expressions', () => {
    const active = true;
    const disabled = false;
    expect(cx('base', active && 'is-active', disabled && 'is-disabled')).toBe('base is-active');
  });

  it('returns an empty string when given no truthy parts', () => {
    expect(cx(false, null, undefined, '')).toBe('');
    expect(cx()).toBe('');
  });
});
