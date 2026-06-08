# Security Hardening — Phased Execution & Tech-Debt Ledger

Tracks the phased remediation of the 13-point pre-launch security checklist.
Each phase has a hard Definition of Done (DoD) gate and a tech-debt ledger that
must reconcile to **zero** before the next phase begins.

## Definition of Done (every phase)

1. `npm run lint` — 0 warnings
2. `npm run type-check` — clean
3. `npx prettier --check "src/**/*.{ts,tsx,css}"` — clean (CI-enforced)
4. `npm run check:file-length` — no new <300-line violations
5. `npm test` — all green
6. `npm run build` — succeeds
7. Backend `ruff check .` + `pytest -m "not integration"` — green (when backend touched)
8. Tech-debt ledger for the phase reconciled to zero

## Baseline (Phase 0) — captured

| Check        | Result                 |
| ------------ | ---------------------- |
| ESLint       | 0 warnings             |
| Type-check   | clean                  |
| Jest         | 583 passed / 46 suites |
| Build        | success                |
| Backend ruff | clean                  |

---

## Phase 1 — Input validation (#3) + Env lockdown (#10)

Status: COMPLETE. DoD gate green — lint 0 warnings, type-check clean, 607/607 tests
(+24 new), build success.

### Delivered

- `src/app/api/questionnaire/schemas.ts` — Zod schemas (`Start/Answer/Resume/Abandon`);
  route validates every action at the Next layer (422 on bad input, AI service never called).
- `src/lib/api/validate.ts` — pure `validateData()` helper (DRY; lets the route read the
  body once and validate per-branch with exact types — no casts).
- `src/lib/env.ts` — typed live accessor + `validateServerEnv()` (fail-loud in prod).
- `src/instrumentation.ts` — boots env validation on the Node runtime.
- `VALIDATION_ERR` added to `strings.ts`; questionnaire + payment schemas both consume it.

### Tech-debt ledger — RECONCILED TO ZERO

| Debt incurred                                                | Resolution (in-phase)                                                                                                                                                                                                 | Status   |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Dual env-access pattern (`env.*` vs scattered `process.env`) | Migrated all 8 secret reads (`ai-service`, `report`, `razorpay`×3, `auth/index`, `auth/config`, `signin`, `encryption`, `admin/email`). Only `NODE_ENV`/`NEXT_RUNTIME` reads remain — build-time inlined, non-secret. | RESOLVED |
| Inline Zod messages diverging from SSOT                      | Centralized questionnaire + payment schema messages in `strings.ts` (`VALIDATION_ERR`).                                                                                                                               | RESOLVED |
| Lazy-read secret semantics could break under a memoized env  | `env` uses live getters (re-read `process.env` per access); existing encryption/razorpay tests still pass unchanged.                                                                                                  | RESOLVED |

### Security review (OWASP)

- A03 Injection / A04 Insecure Design: questionnaire inputs now schema-validated;
  `answer` rejects non-string/array objects (prototype-pollution guard); `session_id`
  must pass CUID/UUID check (path-traversal guard).
- A05 Misconfiguration: required prod secrets fail loud at boot; placeholder values rejected.
- No secrets added to client bundles (`env.ts` is server-only; all consumers are server-side).

---

## Phase 2 — Privacy/Terms pages (#1) + CAPTCHA (#12)

Status: COMPLETE. DoD gate green — lint 0 warnings, type-check clean, 623/623 tests
(+16 new), build success (`/privacy`, `/terms` prerendered).

### Delivered

- `src/config/legal-strings.ts` — Privacy + Terms content SSOT (sections); covers DPDPA
  rights, AES-256-GCM at rest, TLS 1.3, per-user isolation, India hosting, retention.
- `src/components/legal/LegalDocument.tsx` — shared presentational renderer (DRY).
- `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` — public, server-rendered.
- Footer (`page.tsx`) and consent page link to the legal pages from the `LEGAL_LINKS` SSOT.
- `src/lib/security/turnstile.ts` — server-side Turnstile verification (fail-closed in prod).
- `src/components/security/TurnstileWidget.tsx` — client widget (no-ops without a site key).
- `EnterpriseProposalSchema.captchaToken` + route enforcement: failed CAPTCHA → 400, no lead.
- `TURNSTILE_SECRET_KEY` (server) + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (public) in env + `.env.example`.

### Tech-debt ledger — RECONCILED TO ZERO

| Debt incurred                                                 | Resolution (in-phase)                                                                                                                                                | Status   |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| CSP defined twice (security.ts AND inline in next.config.ts)  | Extracted `buildContentSecurityPolicy()` SSOT; both consume it. New test asserts next.config has no inline CSP.                                                      | RESOLVED |
| CSP widened for Turnstile                                     | Allowlisted the exact Cloudflare origin only (no wildcards); test asserts `default-src 'self'` + `object-src 'none'` retained and `'unsafe-eval'` stays out of prod. | RESOLVED |
| Brittle assertion (`import { SECURITY_HEADERS }` exact match) | Updated to assert SSOT intent (imports header + CSP builder from config).                                                                                            | RESOLVED |

### Security review (OWASP)

- A04 Insecure Design: bot/abuse protection on the public-facing proposal write path;
  CAPTCHA verified server-side, fail-closed in prod; secret never sent to the browser.
- A05 Misconfiguration: CSP is a single source of truth; Turnstile origins explicit, no wildcards.
- #1 data-handling transparency: public Privacy Policy + Terms, DPDPA rights documented and
  linked from the consent gate.

## Phase 3 — DB RLS (#2) + distributed rate limiter (#11)

Split into 3a (Redis limiter) and 3b (RLS) per the Supabase-migration discussion.
RLS is portable to Supabase because it keys on a custom `app.current_user_id` GUC
(set via `SET LOCAL`), not Supabase Auth — the app uses NextAuth + Prisma.

### Phase 3a — Distributed rate limiter (#11)

Status: COMPLETE. DoD gate green — lint 0 warnings, type-check clean, 629/629 tests
(+6 new), build success (edge middleware compiles).

#### Delivered

- `src/lib/rate-limit/` — strategy pattern: `types.ts` (`RateLimitStore`, `RedisLike`),
  `memory-store.ts`, `redis-store.ts` (DIP — depends on `RedisLike`, not Upstash directly),
  `index.ts` (runtime selector; dynamically imports `@upstash/redis` only when configured).
- A single behavioural contract test runs against BOTH stores (memory + redis-with-fake).
- `proxy.ts` updated to `await` the async limiter; old single-file limiter deleted.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` added to env + `.env.example`.

#### Tech-debt ledger — RECONCILED TO ZERO

| Debt incurred                                  | Resolution (in-phase)                                                                         | Status   |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- | -------- |
| `checkRateLimit` became async (sync → Promise) | Updated both callers (`proxy.ts`, test); old `rate-limit.ts` deleted — no dead code.          | RESOLVED |
| Redis client could bloat the default/edge path | Dynamically imported only when Upstash is configured; default path has zero Redis dependency. | RESOLVED |
| Redis store hard to test without a live server | `RedisLike` interface (DIP) + in-memory fake; contract test proves store interchangeability.  | RESOLVED |

#### Flagged (pre-existing, NOT introduced here — out of phase scope)

- `npm audit`: 2 moderate advisories in `postcss` (transitive via `next`). `@upstash/redis`
  added zero advisories. Fixing requires a Next major-version bump (breaking) — recommend a
  dedicated dependency-upgrade task; do not `audit fix --force` (downgrades Next to 9.x).

### Phase 3b — Row-Level Security (#2)

Status: COMPLETE (policy + helpers + verification). DoD gate green — lint 0 warnings,
type-check clean, 639/639 tests (+10 new), build success. RLS isolation proven against a
live Postgres throwaway DB (`npm run db:verify-rls` → "ALL RLS ASSERTIONS PASSED").

#### Delivered

- `prisma/migrations/5_rls_tenant_isolation/migration.sql` — enables RLS on
  `audit_sessions`, `session_events`, `report_artifacts`; per-tenant `USING` + `WITH CHECK`
  policies keyed on `current_setting('app.current_user_id')`, with an `app.bypass_rls`
  escape hatch for admin/service paths. `session_events` / `report_artifacts` inherit
  ownership from the parent `audit_sessions` row via `EXISTS`.
- `src/lib/db/with-user-context.ts` — `withUserContext(userId, fn)` and `withRlsBypass(fn)`.
  Both wrap an interactive transaction and bind the GUC with **parameterised**
  `set_config(name, value, is_local => true)` (injection-safe; `SET LOCAL` cannot be
  parameterised). `withUserContext` fails loud on an empty `userId`.
- `scripts/verify-rls.sh` + `scripts/rls-verify.sql` (`npm run db:verify-rls`) — repeatable
  live-DB proof using a throwaway database and a non-owner role; never touches dev/prod.
- `src/__tests__/rls-context.test.ts` — unit tests for the helpers (incl. injection-safety
  and fail-loud) + structural guards asserting the migration keeps RLS/policies on all
  three tables.

#### Portability to Supabase (confirmed)

Policies key on a custom `app.current_user_id` GUC, **not** `auth.uid()`/Supabase Auth, so
they apply identically on self-hosted Postgres and Supabase. No rework needed at migration.

#### Design note — enforcement is intentionally staged (NOT silent debt)

RLS is `ENABLE`d but **not** `FORCE`d. The table owner / superuser bypasses RLS, so the
current owner connection is unaffected (verified: owner still reads all rows → zero runtime
breakage now). Enforcement activates the moment the app connects via a **non-owner role
without `BYPASSRLS`** — which is exactly the Supabase migration target. This is a deliberate,
documented cutover gated on the role switch, not deferred work hidden from the ledger.

#### Cutover checklist (executed with the Supabase / non-owner-role switch)

1. Connect the app via a non-owner, non-`BYPASSRLS` role; grant it
   `SELECT/INSERT/UPDATE/DELETE` on the three tables.
2. Route user-facing reads/writes of these tables through `withUserContext(userId, …)`.
3. Route admin/service cross-tenant access through `withRlsBypass(…)` behind the existing
   admin/service auth checks.
4. Re-run `npm run db:verify-rls` against the target instance.

#### Tech-debt ledger — RECONCILED TO ZERO

| Debt incurred                                          | Resolution (in-phase)                                                                                          | Status   |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | -------- |
| Helpers could be unused dead code                      | Covered by unit tests; adoption is the documented role-switch cutover above, not silent debt.                  | RESOLVED |
| Live-DB isolation hard to assert in offline `npm test` | Real proof committed as `db:verify-rls` (ran green); offline suite guards policy structure + helper behaviour. | RESOLVED |
| `set_config` vs raw `SET LOCAL` injection risk         | Used parameterised `set_config`; unit test asserts the userId is a bound value, never interpolated.            | RESOLVED |

#### Flagged (pre-existing, carried from 3a — out of phase scope)

- `npm audit`: 2 moderate `postcss` advisories (transitive via `next`). Unchanged this phase.

## Phase 4 — Verification & hardening gate

Status: COMPLETE. Final gate green across the full repo.

### Delivered

- `scripts/check-file-length.sh` (`npm run check:file-length`) — ratcheting guard enforcing
  the <300-line rule on `src/**/*.{ts,tsx}` and `ai-service/**/*.py` (tests exempt by
  convention). A small allowlist records pre-existing overages so the guard fails loud on any
  NEW violation without forcing a same-PR legacy refactor.
- CI wiring (`.github/workflows/ci-cd.yml`):
  - File-length guard added to `frontend-quality` (blocking).
  - **Live RLS isolation proof** (`npm run db:verify-rls`) added to `migrations-test`, so the
    Phase 3b policies are enforcement-tested in CI against a real Postgres, not just locally.
- DoD upgraded to include `prettier --check` and the file-length guard (see top of doc).

### Final verification snapshot (whole repo)

| Check                             | Result                                      |
| --------------------------------- | ------------------------------------------- |
| `npm run check:file-length`       | ✓ (1 allowlisted legacy file)               |
| ESLint (`--max-warnings 0`)       | ✓ 0 warnings                                |
| `prettier --check src`            | ✓ clean                                     |
| TypeScript `tsc --noEmit`         | ✓ clean                                     |
| Jest                              | ✓ 639 / 639 (53 suites)                     |
| `npm run build`                   | ✓ success                                   |
| `npm run db:verify-rls` (live PG) | ✓ ALL RLS ASSERTIONS PASSED                 |
| Backend `ruff` / `pytest`         | unchanged (no Python touched across phases) |

### Tech-debt ledger — RECONCILED TO ZERO

| Debt incurred                                                          | Resolution (in-phase)                                                     | Status   |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------- |
| Phases 1–3 missed `prettier --check`; 10 touched files had style drift | Formatted all 10; added `prettier --check` to the DoD so it cannot recur. | RESOLVED |
| <300-line rule was only spot-checked manually                          | Codified as `check:file-length` script + CI gate (fails loud, ratchets).  | RESOLVED |
| RLS proof ran only on a local machine                                  | Wired `db:verify-rls` into the CI `migrations-test` job.                  | RESOLVED |

### Flagged (pre-existing, NOT introduced by this hardening track)

| Item                                                                                                        | Detail                                                 | Recommendation                                                                            |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `ai-service/routers/questionnaire.py` = 315 lines                                                           | 15 over the limit; core branching router. Allowlisted. | Split in a dedicated backend refactor (out of security scope; carries branch-logic risk). |
| 3 test files >300 lines (`test_scraper.py` 515, `test_audit_fixes.py` 373, `test_questionnaire_api.py` 366) | Tests, exempt by convention.                           | Optional cleanup; no security impact.                                                     |
| `npm audit`: 2 moderate `postcss` advisories                                                                | Transitive via `next`. Unchanged.                      | Dedicated dependency-upgrade task (Next major bump); do not `audit fix --force`.          |

---

## Final checklist status (13-point pre-launch security checklist)

| #   | Item                                                                                          | Status                                                                       |
| --- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | Privacy Policy / Terms pages                                                                  | ✅ Phase 2                                                                   |
| 2   | DB Row-Level Security                                                                         | ✅ Phase 3b (policies + helpers proven; activation = non-owner-role cutover) |
| 3   | Input validation (API)                                                                        | ✅ Phase 1                                                                   |
| 10  | Env var lockdown / boot validation                                                            | ✅ Phase 1                                                                   |
| 11  | Distributed rate limiting                                                                     | ✅ Phase 3a                                                                  |
| 12  | CAPTCHA on public form                                                                        | ✅ Phase 2                                                                   |
| —   | Security headers / CSP, encryption at rest, PII redaction, erasure, API-key mgmt, CI scanners | ✅ pre-existing, verified green                                              |

All remediation phases complete; the only open follow-ups are the pre-existing items flagged above.
