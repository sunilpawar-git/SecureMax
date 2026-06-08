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

  it('resolves Tailwind utility conflicts in favor of the later class (caller override wins)', () => {
    // A naive string-join would let either class survive depending on the
    // generated stylesheet's source order — fragile and silently wrong when a
    // primitive's base utility and a caller's override target the same CSS
    // property (e.g. Button base `gap-2` vs. a caller's `gap-3`).
    expect(cx('gap-2', 'gap-3')).toBe('gap-3');
    expect(cx('font-medium', 'font-semibold')).toBe('font-semibold');
    expect(cx('px-4 text-sm', 'px-6')).toBe('text-sm px-6');
  });
});
