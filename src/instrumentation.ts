/**
 * Next.js instrumentation hook — runs once when the server process boots.
 * Validates the server environment so misconfiguration fails loud before any
 * request is served (production only; no-op in dev/test).
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateServerEnv } = await import('@/lib/env');
    validateServerEnv();
  }
}
