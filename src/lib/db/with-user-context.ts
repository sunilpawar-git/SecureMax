import { prisma } from '@/lib/prisma';

/**
 * Per-request tenant context for Postgres Row-Level Security.
 *
 * RLS policies (migration `5_rls_tenant_isolation`) key on the `app.current_user_id`
 * GUC. These helpers run the supplied callback inside an interactive transaction and
 * set that GUC with `set_config(name, value, is_local => true)` — equivalent to
 * `SET LOCAL`, so the value is scoped to the transaction and reset automatically.
 *
 * `set_config` is used instead of a raw `SET LOCAL` statement because `SET LOCAL`
 * cannot be parameterised; `set_config` accepts a bind parameter, so the user id can
 * never be string-interpolated into SQL (injection-safe).
 */

/** The interactive-transaction client surface (no nested tx / lifecycle methods). */
export type RlsTxClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Run `fn` with the tenant context bound to `userId`. RLS policies then restrict
 * every query inside `fn` to rows owned by that user.
 */
export async function withUserContext<T>(
  userId: string,
  fn: (tx: RlsTxClient) => Promise<T>,
): Promise<T> {
  if (!userId) {
    // Fail loud: an empty context would silently expose nothing (or, under bypass,
    // everything). Never allow an ambiguous tenant boundary.
    throw new Error('withUserContext requires a non-empty userId');
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
    return fn(tx as RlsTxClient);
  });
}

/**
 * Run `fn` with RLS bypassed — for admin and trusted service paths that legitimately
 * span tenants. Use sparingly and only behind an authenticated admin/service check.
 */
export async function withRlsBypass<T>(fn: (tx: RlsTxClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
    return fn(tx as RlsTxClient);
  });
}
