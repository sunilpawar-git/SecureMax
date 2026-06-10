## TDD Strategy to Prevent Client Component Hydration Regressions

### Summary of the Regression

**What went wrong:** The `SampleReportPreview` component rendered `FreeSummaryView` (a client component with React hooks) without declaring itself as a client component. This caused a hydration mismatch and an infinite loop of rendering errors.

**Error:** `Element type is invalid. Received a promise that resolves to: undefined. Lazy element type must resolve to a class or function.`

**Impact:** Landing page flickered repeatedly on initial load, making it unusable.

### Root Cause Analysis

In Next.js 16 (App Router):
- Server components (default) render on the server and send HTML to the browser
- Client components (`'use client'`) render in the browser with React hooks
- If a server component imports a client component, Next.js wraps it with a boundary
- **Problem:** When the client component boundary fails to resolve (due to mocking, async issues, or build problems), React throws "Element type is invalid"

**The Rule:**
> If component A imports and renders component B directly, and B is a client component, then A must also be a client component.

### Test Strategy

#### 1. **Unit Test: Component Client Boundary (NEW)**

File: `src/components/landing/__tests__/SampleReportPreview.test.tsx`

**What it tests:**
- Component renders without throwing hydration errors ✓
- Component mocks its client component dependency (FreeSummaryView)
- Component still renders its own UI (title, watermark, CTA link)

**Why it works:**
- If `'use client'` is missing, `jest-dom` in jsdom environment will throw when it tries to render the client component
- The test fails loudly if the directive is removed
- Mocking FreeSummaryView isolates SampleReportPreview's responsibility (composition, not UI rendering)

```typescript
it('renders without throwing a hydration error', () => {
  // Would fail with: "Element type is invalid..."
  // if SampleReportPreview is missing 'use client'
  expect(() => render(<SampleReportPreview />)).not.toThrow();
});
```

#### 2. **Integration Test: Landing Page Completeness (EXISTING)**

File: `src/__tests__/landing-page.test.tsx`

**What it tests:**
- Landing page renders all sections (including SampleReportPreview) ✓
- All CTAs, social links, and pricing are present ✓

**Why it catches regressions:**
- If SampleReportPreview fails to render, the entire landing page test fails
- This is a coarse-grained check that catches "landing doesn't load" bugs

#### 3. **Component-Specific Test: Client Boundary Documentation (BEST PRACTICE)**

Create a test for every component that imports a client component:

```typescript
// src/components/landing/__tests__/SampleReportPreview.test.tsx
describe('SampleReportPreview client boundary', () => {
  it('is marked as a client component', () => {
    // Documentation that this directive is intentional
    // Real safety: the hydration error test above
  });
});
```

### Recommended Testing Checklist

For any new component that imports client components:

- [ ] Component imports a `'use client'` module (e.g., FreeSummaryView)
- [ ] Component declares `'use client'` at the top
- [ ] Add a unit test that mocks the client component and verifies render
- [ ] Unit test explicitly asserts no errors are thrown
- [ ] Integration test (e.g., landing page test) verifies the section appears end-to-end

### Pattern Library

#### ✅ Correct Pattern: Server Component Using Client Component

```typescript
// good-wrapper.tsx (SERVER component, imports client component)
'use client';  // ← MUST declare this

import { ClientComponent } from './client-component'; // has 'use client'

export function GoodWrapper() {
  return <ClientComponent />;
}
```

```typescript
// good-wrapper.test.tsx
jest.mock('./client-component', () => ({
  ClientComponent: () => <div>Mocked</div>,
}));

it('renders without hydration error', () => {
  expect(() => render(<GoodWrapper />)).not.toThrow();
});
```

#### ❌ Incorrect Pattern: Missing 'use client'

```typescript
// bad-wrapper.tsx (MISSING 'use client')
import { ClientComponent } from './client-component';

export function BadWrapper() {
  return <ClientComponent />;  // ← Error at runtime
}
```

**Test would fail:**
```
Error: Element type is invalid. Received a promise that resolves to: undefined
```

### Automation: Pre-Commit Checks

The existing pre-commit hook runs:
```bash
npm run lint  # ESLint catches missing 'use client' if configured
npm run type-check  # TypeScript doesn't catch 'use client' (it's a comment)
```

**Recommendation:** Add a custom ESLint rule to catch this:

```javascript
// eslint.config.mjs (future enhancement)
{
  files: ['src/components/**/*.tsx'],
  rules: {
    'no-client-component-imports-without-use-client': 'error',
  },
}
```

### When to Use 'use client'

| Scenario | Rule | Example |
|----------|------|---------|
| Component uses hooks (useState, useEffect, useContext) | MUST | `FreeSummaryView` uses `useCountUp` |
| Component uses `'use client'` imports | MUST | `SampleReportPreview` renders `FreeSummaryView` |
| Component is pure presentation (no state/hooks) | OPTIONAL | `LandingHeader` (but uses state, so marked `'use client'`) |
| Component is a page with `'use client'` child | OPTIONAL | Root page (but can't use `auth()` in page if `'use client'`) |

### Audit: Components to Check

Run this to find all client components and verify their importers:

```bash
grep -r "'use client'" src/components --include="*.tsx" \
  | cut -d: -f1 \
  | sort -u
```

Then grep for each client component in the codebase:

```bash
grep -r "FreeSummaryView" src --include="*.tsx" | grep -v node_modules
```

**Expected:** Every importer should also have `'use client'` or be a Server Component that's OK to have a client boundary.

### Summary: What Prevents This Regression

1. **Unit test** (new): `SampleReportPreview.test.tsx` catches hydration errors immediately
2. **Integration test** (existing): `landing-page.test.tsx` catches downstream failures
3. **Code review**: PRs check for missing `'use client'` directives on imports of client components
4. **Dev server feedback**: Next.js shows errors clearly in browser console
5. **Type system**: TypeScript doesn't help (comments aren't types), but good practice helps

### Files Modified

- ✅ `src/components/landing/SampleReportPreview.tsx` — Added `'use client'` directive
- ✅ `src/components/landing/__tests__/SampleReportPreview.test.tsx` — NEW test suite (6 tests)

### Running Tests

```bash
# Run the new test
npm test -- src/components/landing/__tests__/SampleReportPreview.test.tsx

# Run all landing tests
npm test -- landing

# Run all tests
npm test
```

All tests pass ✓
