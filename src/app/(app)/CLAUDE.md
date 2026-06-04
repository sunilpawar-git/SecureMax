# CLAUDE.md — `src/app/(app)/`

Authenticated user-facing routes: questionnaire, report, payment, dashboard, onboarding, enterprise proposal.

## Rules

- **Server Components by default** — add `'use client'` only when state/hooks are needed; document why
- **Never call `auth()` in Client Components** — pass session data as props from Server Component parent
- **`X-User-Id` for API calls** is always derived from `auth()` server session — never from URL params or request body
- **Questionnaire state** lives in `questionnaire-service.ts` — no fetch logic in `page.tsx` or `question-card.tsx`
- **Report sub-pages** (`/status`, `/summary`, `/download`) each have a single responsibility — do not merge them
- **Payment verification** — always check `AuditSession.userId === session.user.id` before rendering Razorpay widget

## Imports

- `auth()` from NextAuth (server-side only)
- `aiServiceFetch<T>()` from `@/lib/ai-service` for FastAPI calls
- `withUserContext(userId, fn)` from `@/lib/db/with-user-context` for DB queries
- Session data passed as props to client components

## Common Pitfalls

1. Calling `auth()` inside Client Components → breaks SSR, passes stale session
2. Fetching questionnaire state in multiple places → causes cache misses, duplicated branching logic
3. Merging report sub-pages → violates single responsibility, hard to test and cache
4. Missing session ownership check on payment → allows CSRF/tampering
