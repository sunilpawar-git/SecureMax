import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 600;

/**
 * Animates a displayed integer toward `target` using requestAnimationFrame.
 *
 * Two deliberate carve-outs (assertion #12):
 *  - **Skips the initial mount** — on first render it returns `target`
 *    immediately, so a freshly loaded or resumed session never count-ups from
 *    zero. Animation runs only on a *subsequent* change.
 *  - **Respects `prefers-reduced-motion`** — jumps straight to the target.
 *
 * MVVM: this is the questionnaire's animation view-model; the radar component
 * stays presentational and just renders the returned number.
 */
export function useCountUp(target: number): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const mountedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // First effect run = mount/resume: show the target instantly, no animation.
    if (!mountedRef.current) {
      mountedRef.current = true;
      fromRef.current = target;
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const from = fromRef.current;
    const delta = target - from;

    if (prefersReducedMotion || delta === 0) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(from + delta * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  return display;
}
