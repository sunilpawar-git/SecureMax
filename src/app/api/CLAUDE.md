# CLAUDE.md — `src/app/api/`

All Next.js API route handlers. Standardized auth, validation, response formatting.

## Rules

- **Auth**: use `requireAuth()` or `requireAdmin()` from `@/lib/api/guards` — no ad-hoc `auth()` calls
- **Input validation**: use `parseBody()` from `@/lib/api/validate` — no manual `JSON.parse`
- **Response formatting**: use `apiSuccess()` / `apiError()` from `@/lib/api/response` — no raw `Response` construction
- **Admin routes under `api/admin/`** — never mix user and admin logic in the same route file
- **Questionnaire route** proxies to FastAPI via `aiServiceFetch` in `@/lib/ai-service` — add no DB logic there
- **Rate limiting**: call `checkRateLimit()` on every public-facing endpoint before processing
- **Dev-only routes** (`api/dev/`) must gate with `process.env.NODE_ENV === 'development'` check at the top

## Common Patterns

```typescript
// ✓ Correct
import { requireAuth, requireAdmin } from '@/lib/api/guards';
import { parseBody, apiSuccess, apiError } from '@/lib/api';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const session = await requireAuth(req);  // Throws 401 if not authed
  
  const result = await checkRateLimit(session.user.id, 60000, 10);
  if (!result.ok) return apiError('Rate limit exceeded', 429);
  
  const { data, error } = await parseBody(req, MySchema);
  if (error) return apiValidationError(error);
  
  // ... mutation logic via service ...
  return apiSuccess(result);
}
```

## Common Pitfalls

1. Using `auth()` directly instead of `requireAuth()` → missing 401 response
2. Manual `JSON.parse()` → no validation, poor error messages
3. Constructing raw `Response` objects → inconsistent error formatting
4. Admin logic mixed with user routes → scope creep, harder to audit
5. Missing `checkRateLimit()` on public endpoints → DDoS vector
6. Skipping `/api/dev/` env guard → dev-only code reaches production
