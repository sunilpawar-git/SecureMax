# CLAUDE.md — `src/components/`

Shared React components: landing sections, report widgets, security UI, legal documents.

## Rules

- **Server Components by default** — add `'use client'` only when unavoidable; document why
- **All user-facing copy from `@/config/strings.ts`** — no hardcoded UI strings
- **All brand colors from `@/config/colors.ts`** — no hardcoded Tailwind color classes
- **`TurnstileWidget` must wrap every public-facing form** (enterprise proposal, any unauthenticated input)
- **`AppLayoutShell` handles auth redirect** — do not add `redirect()` in individual page components
- **`ResumePrompt` appears on dashboard** when an incomplete session exists — do not duplicate this logic

## Component Organization

| Folder / File        | Purpose                                                                       |
| -------------------- | ----------------------------------------------------------------------------- |
| `landing/`           | Marketing page sections: HeroSection, HowItWorks, LandingHeader, TrustSignals |
| `report/`            | Report viewer: FindingCard, FreeSummaryView                                   |
| `security/`          | TurnstileWidget (Cloudflare CAPTCHA)                                          |
| `legal/`             | LegalDocument (reusable legal doc renderer)                                   |
| `AppHeader.tsx`      | Authenticated app header with nav                                             |
| `AppLayoutShell.tsx` | Layout shell wrapper; auth redirect check                                     |
| `ResumePrompt.tsx`   | "Resume your session" prompt banner                                           |

## Common Patterns

```typescript
// ✓ Server Component with string/color constants
import { config } from '@/config';

export default function FindingCard({ finding }) {
  return (
    <div className={`bg-${config.colors.SEVERITY[finding.severity]}`}>
      <h3>{config.strings.FINDING_LABEL}</h3>
    </div>
  );
}

// ✓ CAPTCHA protection on public form
import { TurnstileWidget } from '@/components/security/TurnstileWidget';

export function EnterpriseProposalForm() {
  return (
    <form>
      <TurnstileWidget />
      {/* form fields */}
    </form>
  );
}
```

## Common Pitfalls

1. Calling `auth()` in Client Components → breaks SSR
2. Hardcoding UI copy → inconsistency when strings change
3. Hardcoding Tailwind colors → inconsistency when theme changes
4. Missing `TurnstileWidget` on public forms → spam vector
5. Using `redirect()` in page components → should be in layout
6. Duplicating session resume logic → hard to maintain, test
