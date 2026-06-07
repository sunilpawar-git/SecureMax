# CLAUDE.md — `src/config/`

App-wide constants: strings, colors, security parameters. Pure configuration; no runtime logic.

## Rules

- **Pure config only** — no runtime logic, no imports from `src/lib/`, no async code
- **`index.ts` is the only import path** — always `import { ... } from '@/config'`, never from a direct file
- **User-facing strings** → `strings.ts`, admin strings → `admin-strings.ts`, legal copy → `legal-strings.ts`
- **Color tokens** → `colors.ts` (user app) or `admin-colors.ts` (admin panel)
- **`security.ts` owns CSP policy, rate limit windows, encryption constants** — edit here, not inline
- **Enum values** (statuses, action types) live here, not in DB schema or service files

## Files

| File               | Contains                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `index.ts`         | Barrel export                                                                                      |
| `strings.ts`       | APP, CTA, TRACK, USER_ROLE, LIMITS, PAYMENT, UI labels, error messages                             |
| `admin-strings.ts` | ADMIN_ACTION_TYPE, LEAD_STATUS, scraper/followup/webhook enums, email templates                    |
| `legal-strings.ts` | Privacy policy, terms of service copy                                                              |
| `colors.ts`        | Tailwind color token constants for user app UI                                                     |
| `admin-colors.ts`  | Tailwind color token constants for admin panel                                                     |
| `security.ts`      | SECURITY_HEADERS (CSP, HSTS, X-Frame-Options), RATE_LIMITS, ENCRYPTION constants, SESSION_SECURITY |

## Import Convention

```typescript
// ✓ Correct
import { config } from '@/config';
const name = config.APP.NAME;
const color = config.COLORS.SEVERITY.CRITICAL;
const limit = config.LIMITS.MAX_SESSIONS_PER_MONTH;

// ✗ Wrong
import { APP } from '@/config/strings'; // Direct import from file
import { COLORS } from '@/config/colors'; // Direct import from file
```

## Common Pitfalls

1. Importing directly from a config file → breaks barrel pattern, defeats tree-shaking
2. Adding runtime logic (API calls, calculations) → defeats purpose of constants
3. Hardcoding strings/colors in components → defeats config
4. Splitting related enums across files → hard to find and maintain
5. Adding async code → config evaluation delays app startup
