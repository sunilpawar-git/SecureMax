# CLAUDE.md — `tests/e2e/`

Playwright E2E test suite: golden-path user journeys for HNI, Enterprise, and Admin panel.

## Rules

- **E2E tests require both services running**: Next.js (port 3000) + FastAPI (port 8000)
- **Golden session fixtures** in `golden_sessions/` are canonical — never edit JSON fixtures without updating the corresponding spec
- **Three coverage areas**: HNI golden path, Enterprise golden path, Admin panel
- **Auth helpers in `helpers/auth.ts`** — use these for all test sign-ins; never hardcode credentials
- **E2E tests validate full user journeys** (start → questionnaire → payment → report); not unit behavior
- **Run**: `npm run test:e2e` from project root (requires running services)

## Test Files

| File                             | Scope                                                     | Fixture                                                   |
| -------------------------------- | --------------------------------------------------------- | --------------------------------------------------------- |
| `hni-golden-path.spec.ts`        | HNI user journey start → questionnaire → payment → report | `golden_sessions/hni-high-risk.json`, `hni-low-risk.json` |
| `enterprise-golden-path.spec.ts` | Enterprise user journey                                   | `golden_sessions/enterprise-high-risk.json`               |
| `admin-golden-path.spec.ts`      | Admin dashboard, session review, report unlock            | None (admin-specific)                                     |

## Running Tests

```bash
# Start both services first (in separate terminals)
npm run dev                # Next.js on port 3000
cd ai-service && uvicorn main:app --reload --port 8000  # FastAPI on port 8000

# In a third terminal, run E2E tests
npm run test:e2e

# Single test file
npm run test:e2e -- hni-golden-path.spec.ts

# Debug mode (opens Playwright Inspector)
npm run test:e2e -- --debug
```

## Auth Helpers

```typescript
// ✓ Use auth helpers from helpers/auth.ts
import { signInWithGoogle } from './helpers/auth';

test('HNI signs in with Google', async ({ page }) => {
  await signInWithGoogle(page, 'test-hni@example.com');
  await expect(page).toHaveURL('/questionnaire');
});
```

## Test Structure

1. **Auth** — User signs in (Google OAuth)
2. **Navigation** — User navigates to questionnaire page
3. **Questionnaire** — User answers questions in sequence; AI branching occurs
4. **Completion** — Questionnaire reaches terminal; report generation triggered
5. **Payment** — User sees payment prompt; completes Razorpay flow
6. **Report** — User downloads PDF report
7. **Verification** — Assertions on final report content (domain scores, findings, etc.)

## Common Pitfalls

1. Hardcoding email/password → violates auth helper pattern
2. Running E2E without services → timeout, confusing errors
3. Editing fixtures manually → breaks test reproducibility
4. Testing implementation details (button classes) → brittle to UI changes
5. Missing auth helpers → duplication across specs
6. Not verifying final outcomes → tests pass even if journey broken
7. Stale fixture sessions → payment flows fail if session is old
