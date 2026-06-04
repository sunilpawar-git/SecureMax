# CLAUDE.md — `src/app/admin/`

Admin panel UI: dashboard, sessions, reports, leads, scraper, linkedin, users, audit-log. Role-gated; MVVM enforced.

## Rules

- **Role gate in `layout.tsx`** (server component) — do not add redundant checks in child pages
- **MVVM pattern**: `_components/` = View (no data fetching), `_hooks/` = ViewModel (no JSX)
- **`page.tsx` is thin orchestrator only** — all state delegated to `_hooks/`
- **Every mutation through `src/lib/admin/` services** — no direct Prisma calls in route handlers
- **`logAdminAction()` is mandatory** for every write operation (audit trail — Rule 15)
- **Admin strings** live in `@/config/admin-strings.ts`, colors in `@/config/admin-colors.ts`
- **`withRlsBypass(fn)` required** for all admin DB queries (admins cross tenant boundaries)

## Imports

- `requireAdmin()` from `@/lib/api/guards` for API route auth
- Services from `@/lib/admin` (leads, reports, threat-intel, users, etc.)
- `withRlsBypass()` from `@/lib/db/with-user-context` for DB access
- `logAdminAction()` from `@/lib/admin/actions` for audit trail
- Strings from `@/config/admin-strings`, colors from `@/config/admin-colors`

## Common Pitfalls

1. Checking admin role in child pages → duplicate work, missed edge cases
2. Fetching data directly from Prisma in page.tsx → violates MVVM, hard to test
3. Mixing View and ViewModel logic → breaks reusability, makes testing harder
4. Forgetting `logAdminAction()` → breaks audit trail (Rule 15)
5. Hardcoding admin strings/colors → inconsistency when theme changes
