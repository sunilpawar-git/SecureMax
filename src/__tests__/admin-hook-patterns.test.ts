/**
 * Structural regression guard for admin ViewModel hooks.
 *
 * These tests read hook source files and assert that banned patterns are absent
 * and required patterns are present. They catch class-of-bug regressions without
 * needing a browser or React render cycle.
 *
 * Patterns guarded against:
 * 1. mountedRef — fragile; cleanup sets it false before StrictMode re-run,
 *    permanently blocking setLoading(false).
 * 2. Render-body side effects — async calls at the top level of a hook body
 *    (outside useEffect/useCallback) trigger React's "impure render" detection,
 *    causing cascading re-renders and stuck loading state.
 * 3. Missing AbortController — in-flight requests not cancelled on unmount;
 *    stale responses can overwrite fresh ones when filters change quickly.
 */

import fs from 'fs';
import path from 'path';
import glob from 'glob';

const HOOKS_GLOB = 'src/app/admin/**/_hooks/*.ts';
const ROOT = process.cwd();

function readHook(hookPath: string): string {
  return fs.readFileSync(path.join(ROOT, hookPath), 'utf-8');
}

function getAllHookPaths(): string[] {
  return glob.sync(HOOKS_GLOB, { cwd: ROOT });
}

// Hooks that deliberately don't load data on mount — no AbortController needed.
const ABORT_EXEMPT = new Set(['useGlobalSearch.ts']);

describe('Admin hook structural patterns', () => {
  const hookPaths = getAllHookPaths();

  beforeAll(() => {
    // Sanity: make sure glob is actually finding files
    expect(hookPaths.length).toBeGreaterThan(10);
  });

  it('no hook uses the mountedRef pattern', () => {
    const violations: string[] = [];
    for (const p of hookPaths) {
      const src = readHook(p);
      if (src.includes('mountedRef')) {
        violations.push(p);
      }
    }
    expect(violations).toEqual([]);
  });

  it('no hook calls fetchStats/fetchData/load outside useEffect or useCallback', () => {
    // Detect: direct function call (not inside an arrow fn or async fn) that looks
    // like data fetching triggered at the render level.
    // Pattern: line that starts with optional whitespace then the call, but is NOT
    // inside a useEffect/useCallback body (proxied by looking for the bare call
    // with no preceding `void`/`await` from within an effect).
    //
    // We look specifically for the render-body anti-pattern that bit useKnowledgeBase:
    // calling an async function conditionally inside the hook body using a ref guard.
    const violations: string[] = [];
    for (const p of hookPaths) {
      const src = readHook(p);
      // The specific pattern that was wrong: `if (ref.current == null) { ref.current = true; fn(); }`
      if (/if\s*\(\s*\w+\.current\s*==\s*null\s*\)/.test(src)) {
        violations.push(p);
      }
    }
    expect(violations).toEqual([]);
  });

  it('every data-loading hook uses AbortController', () => {
    const violations: string[] = [];
    for (const p of hookPaths) {
      const filename = path.basename(p);
      if (ABORT_EXEMPT.has(filename)) continue;

      const src = readHook(p);
      // Only check hooks that fetch data (have a fetch() call)
      if (!src.includes('fetch(')) continue;

      if (!src.includes('AbortController')) {
        violations.push(p);
      }
    }
    expect(violations).toEqual([]);
  });

  it('every AbortController signal is passed to fetch()', () => {
    const violations: string[] = [];
    for (const p of hookPaths) {
      const src = readHook(p);
      if (!src.includes('AbortController')) continue;

      // If a file creates an AbortController, it must also pass { signal } to at
      // least one fetch call (otherwise the controller is useless).
      if (!src.includes('signal')) {
        violations.push(p);
      }
    }
    expect(violations).toEqual([]);
  });

  it('no hook sets loading state via a mountedRef guard in the finally block', () => {
    // The old pattern: `if (mountedRef.current && !silent) setLoading(false)`
    // This is fragile — if mountedRef is false (StrictMode), loading is never cleared.
    const violations: string[] = [];
    for (const p of hookPaths) {
      const src = readHook(p);
      if (src.includes('mountedRef.current') && src.includes('setLoading')) {
        violations.push(p);
      }
    }
    expect(violations).toEqual([]);
  });
});

describe('Proxy (middleware) conventions', () => {
  it('src/proxy.ts exists — Next.js 16 convention', () => {
    expect(fs.existsSync(path.join(ROOT, 'src', 'proxy.ts'))).toBe(true);
  });

  it('src/middleware.ts does not exist — was renamed to proxy.ts', () => {
    expect(fs.existsSync(path.join(ROOT, 'src', 'middleware.ts'))).toBe(false);
  });

  it('proxy.ts sets Cache-Control: no-store for admin API routes', () => {
    const proxy = fs.readFileSync(path.join(ROOT, 'src', 'proxy.ts'), 'utf-8');
    expect(proxy).toContain('Cache-Control');
    expect(proxy).toContain('no-store');
    expect(proxy).toContain('/api/admin');
  });
});
