/**
 * @jest-environment jsdom
 *
 * useCountUp — verifies the two contractual carve-outs: no animation on mount,
 * and a real rAF count-up on a subsequent change that lands exactly on target.
 * Rule 9: these assertions fail if the mount-skip or the easing guard regress.
 */
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from '@/components/chart/use-count-up';

describe('useCountUp', () => {
  let rafCbs: FrameRequestCallback[];
  let now: number;

  beforeEach(() => {
    rafCbs = [];
    now = 0;
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCbs.push(cb);
      return rafCbs.length;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    window.matchMedia = jest
      .fn()
      .mockReturnValue({ matches: false }) as unknown as typeof matchMedia;
  });

  afterEach(() => jest.restoreAllMocks());

  function flush(toMs: number) {
    now = toMs;
    act(() => {
      const cbs = rafCbs;
      rafCbs = [];
      cbs.forEach((cb) => cb(now));
    });
  }

  it('returns the target on mount without scheduling any animation frame', () => {
    const { result } = renderHook(({ t }) => useCountUp(t), { initialProps: { t: 42 } });
    expect(result.current).toBe(42);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('animates toward a new target on change and lands exactly on it', () => {
    const { result, rerender } = renderHook(({ t }) => useCountUp(t), {
      initialProps: { t: 50 },
    });
    expect(result.current).toBe(50);

    rerender({ t: 80 });
    flush(300); // halfway through the 600ms duration
    expect(result.current).toBeGreaterThan(50);
    expect(result.current).toBeLessThan(80);

    flush(600); // animation complete
    expect(result.current).toBe(80);
  });

  it('jumps straight to the target when prefers-reduced-motion is set', () => {
    window.matchMedia = jest
      .fn()
      .mockReturnValue({ matches: true }) as unknown as typeof matchMedia;
    const { result, rerender } = renderHook(({ t }) => useCountUp(t), {
      initialProps: { t: 10 },
    });

    rerender({ t: 90 });
    expect(result.current).toBe(90);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });
});
