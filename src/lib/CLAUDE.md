# CLAUDE.md — `src/lib/`

Server-side library utilities: env, crypto, auth, DB context, logging, rate limiting, API wrappers.

## Rules

- **`env.ts` is SSOT** for all env vars — never use `process.env.*` directly anywhere else
- **`encryption.ts` (AES-256-GCM) is the only encryption path** — never use Buffer, btoa, or custom cipher
- **`withUserContext(userId, fn)` is mandatory** for all user-scoped DB queries (enforces RLS)
- **`withRlsBypass(fn)` is for admin paths only** — document why if used outside `lib/admin/`
- **`logger.ts` strips PII** before emit — never log emails/phones directly; use `logger.*` not `console.*`
- **Rate limiter auto-selects** Redis vs memory based on env — never instantiate `MemoryStore` directly
- **`ai-service.ts` owns all FastAPI calls** — never use `fetch` directly against port 8000

## Core Modules

| File | Purpose |
|------|---------|
| `env.ts` | Typed env var accessor; `validateServerEnv()` called at startup |
| `encryption.ts` | AES-256-GCM encrypt/decrypt with versioned format |
| `logger.ts` | Structured logger; JSON in prod, human-readable in dev; PII-stripping |
| `prisma.ts` | Singleton Prisma client (globalThis pattern) |
| `ai-service.ts` | HTTP client for FastAPI; 30s timeout, `X-Service-Key` auth |

## Common Patterns

```typescript
// ✓ Access env vars
import { env } from '@/lib/env';
const dbUrl = env.DATABASE_URL;  // Typed, validated at startup

// ✓ User-scoped DB query (enforces RLS)
import { withUserContext } from '@/lib/db/with-user-context';
const result = await withUserContext(userId, async (tx) => {
  return tx.user.findUnique({ where: { id: userId } });
});

// ✓ Admin query (crosses tenant boundaries)
import { withRlsBypass } from '@/lib/db/with-user-context';
const result = await withRlsBypass(async (tx) => {
  return tx.auditSession.findMany();  // No tenant filter
});
```

## Common Pitfalls

1. Using `process.env.FOO` directly → no type checking, no validation at startup
2. Inventing a new crypto → vulnerability risk; use `encryption.ts`
3. Querying DB without `withUserContext()` → RLS bypass, tenant leakage (Rule 16)
4. Admin queries without documenting why `withRlsBypass()` is needed → drift over time
5. Logging emails/phones directly → PII in logs, compliance issue
6. Creating `MemoryStore()` for rate limiting → doesn't work across processes
7. Using `fetch` against port 8000 → missing retry/timeout logic, auth header
