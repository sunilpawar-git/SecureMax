# CLAUDE.md — `src/lib/admin/`

Admin service layer: 18 service files for admin mutations and queries. Single source of truth for all admin data access.

## Rules

- **All admin data access through these services** — API routes call services, not Prisma directly
- **`validators.ts` is SSOT** for all admin Zod schemas — add new schemas here, not inline in routes
- **`actions.ts` (`logAdminAction`) called by every mutation** — check it's present before completing any write
- **CSV exports use `maskEmail()`** from `csv-export.ts` before any PII field is included
- **`diff-engine.ts` compares report versions** — do not duplicate diff logic in routes or UI
- **`email.ts` sends via Resend** — never add a second email provider without removing the first

## Service Files

| File                      | Purpose                                                          |
| ------------------------- | ---------------------------------------------------------------- |
| `index.ts`                | Barrel export (import all from `@/lib/admin`)                    |
| `auth.ts`                 | `verifyAdmin()`, `forbiddenResponse()`                           |
| `actions.ts`              | `logAdminAction()`, `getRecentActions()` (immutable audit trail) |
| `stats-service.ts`        | `getDashboardStats()` — KPI aggregations                         |
| `leads-service.ts`        | Lead CRUD with state machine transitions                         |
| `reports-service.ts`      | Report listing, regeneration, unlock                             |
| `diff-engine.ts`          | `compareReports()` — report version diff                         |
| `threat-intel-service.ts` | Scraper article CRUD                                             |
| `validators.ts`           | All admin Zod schemas (lead status, report ops, etc.)            |
| `csv-export.ts`           | `maskEmail()`, `auditLogToCsv()`                                 |
| `email.ts`                | `sendLeadEmail()` via Resend                                     |

## Common Patterns

```typescript
// ✓ Admin mutation
import { logAdminAction } from '@/lib/admin/actions';
import { leadsService } from '@/lib/admin';

async function updateLeadStatus(leadId: string, newStatus: string) {
  const parsed = UpdateLeadSchema.safeParse({ leadId, status: newStatus });
  if (!parsed.success) throw new Error('Invalid input');

  const result = await leadsService.updateLeadStatus(leadId, newStatus);
  await logAdminAction(adminId, 'LEAD_STATUS_UPDATE', { leadId, status: newStatus });

  return result;
}
```

## Common Pitfalls

1. Calling Prisma directly in API route → bypasses service layer, no audit trail
2. Inline Zod schemas in routes → duplication, inconsistent validation
3. Forgetting `logAdminAction()` → breaks audit trail (Rule 15)
4. Including raw emails in CSV exports → PII leak
5. Duplicating diff logic in routes → hard to maintain, test
