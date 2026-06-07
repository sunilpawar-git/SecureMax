/**
 * Unit tests for the RLS tenant-context helpers and a structural guard on the
 * migration that defines the policies. Live-Postgres isolation is proven
 * separately by `scripts/verify-rls.sh` (npm run db:verify-rls).
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface ExecRawCall {
  strings: string[];
  values: unknown[];
}

const execRawCalls: ExecRawCall[] = [];

const txClient = {
  $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => {
    execRawCalls.push({ strings: Array.from(strings), values });
    return Promise.resolve(1);
  },
  auditSession: { findMany: jest.fn() },
};

const transactionMock = jest.fn((cb: (tx: unknown) => unknown) => cb(txClient));

jest.mock('@/lib/prisma', () => ({
  prisma: { $transaction: (cb: (tx: unknown) => unknown) => transactionMock(cb) },
}));

import { withUserContext, withRlsBypass } from '@/lib/db/with-user-context';

beforeEach(() => {
  execRawCalls.length = 0;
  transactionMock.mockClear();
});

describe('withUserContext', () => {
  it('runs the callback inside a single interactive transaction', async () => {
    await withUserContext('user_abc', async () => 'done');
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });

  it('binds app.current_user_id via parameterised set_config (injection-safe)', async () => {
    await withUserContext('user_abc', async () => null);

    expect(execRawCalls).toHaveLength(1);
    const sql = execRawCalls[0].strings.join('?');
    expect(sql).toContain("set_config('app.current_user_id'");
    expect(sql).toContain('true'); // is_local => SET LOCAL semantics
    // The user id must be a bound value, never interpolated into the SQL text.
    expect(execRawCalls[0].values).toEqual(['user_abc']);
    expect(sql).not.toContain('user_abc');
  });

  it('passes the transaction client to the callback and returns its result', async () => {
    const result = await withUserContext('user_abc', async (tx) => {
      expect(tx).toBe(txClient);
      return 42;
    });
    expect(result).toBe(42);
  });

  it('fails loud on an empty userId (no ambiguous tenant boundary)', async () => {
    await expect(withUserContext('', async () => 'x')).rejects.toThrow(/non-empty userId/);
    expect(transactionMock).not.toHaveBeenCalled();
  });
});

describe('withRlsBypass', () => {
  it('sets app.bypass_rls = on inside a transaction', async () => {
    const result = await withRlsBypass(async () => 'ok');

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(execRawCalls).toHaveLength(1);
    const sql = execRawCalls[0].strings.join('?');
    expect(sql).toContain("set_config('app.bypass_rls', 'on', true)");
    expect(result).toBe('ok');
  });
});

describe('migration 5_rls_tenant_isolation', () => {
  const migrationSql = readFileSync(
    join(process.cwd(), 'prisma/migrations/5_rls_tenant_isolation/migration.sql'),
    'utf8',
  );

  it.each(['audit_sessions', 'session_events', 'report_artifacts'])(
    'enables RLS and defines an isolation policy on %s',
    (table) => {
      expect(migrationSql).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
      expect(migrationSql).toContain(`ON "${table}"`);
    },
  );

  it('keys policies on app.current_user_id with an app.bypass_rls escape hatch', () => {
    expect(migrationSql).toContain("current_setting('app.current_user_id', true)");
    expect(migrationSql).toContain("current_setting('app.bypass_rls', true) = 'on'");
  });

  it('enforces WITH CHECK to block cross-tenant writes on audit_sessions', () => {
    expect(migrationSql).toMatch(/audit_sessions_tenant_isolation[\s\S]*WITH CHECK/);
  });
});
