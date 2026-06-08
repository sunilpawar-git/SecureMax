# CLAUDE.md — `prisma/`

Database schema, migrations, generated client. PostgreSQL + pgvector.

## Rules

- **Never edit `src/generated/prisma/`** — run `npx prisma generate` to regenerate
- **Schema changes require migration** — run `npx prisma migrate dev --name <desc>`
- **`SessionEvent` is append-only** — no UPDATE or DELETE, ever (Rule 15)
- **`AdminAction` is append-only** — no UPDATE or DELETE, ever (Rule 15)
- **`CppChunk` uses `vector(3072)`** — embedding model must stay consistent with `gemini-embedding-exp-03-07`
- **RLS policies live in migration `5_rls_tenant_isolation`** — test with `scripts/rls-verify.sql` after any auth change
- **`AuditSession.pdfEncrypted` and `SessionEvent.answerEncrypted`** must never be queried in plaintext — decrypt via `crypto.py` / `encryption.ts`

## Key Models

| Model            | Purpose                             | Mutation Allowed   |
| ---------------- | ----------------------------------- | ------------------ |
| `AuditSession`   | Questionnaire run                   | CU (no DELETE)     |
| `SessionEvent`   | Immutable answer + AI reasoning log | C only (Rule 15)   |
| `AdminAction`    | Immutable admin audit trail         | C only (Rule 15)   |
| `ReportArtifact` | Encrypted PDF report                | C only (immutable) |
| `CppChunk`       | pgvector embeddings of CPP PDFs     | CU (seeded)        |

## RLS Enforcement

All queries go through either:

- `withUserContext(userId, fn)` — sets `app.current_user_id` in transaction scope
- `withRlsBypass(fn)` — admin-only, crosses tenant boundaries (document why it's needed)

RLS policies automatically filter by `app.current_user_id` GUC.

## Encryption

| Table.Column                        | Content                   | Encryption                     |
| ----------------------------------- | ------------------------- | ------------------------------ |
| `SessionEvent.answerEncrypted`      | User's answer to question | AES-256-GCM (key per session)  |
| `SessionEvent.aiReasoningEncrypted` | AI's branching reasoning  | AES-256-GCM (key per session)  |
| `ReportArtifact.pdfEncrypted`       | PDF report bytes          | AES-256-GCM (key per artifact) |

Decrypt via:

- Python: `decrypt(ciphertext, session_id)` in `ai-service/crypto.py`
- TypeScript: `decrypt(ciphertext, sessionId)` in `src/lib/encryption.ts`

## Common Pitfalls

1. Editing generated Prisma files → changes lost on next `generate`
2. Missing migration for schema changes → development/production mismatch
3. Deleting from `SessionEvent` or `AdminAction` → breaks audit trail (Rule 15)
4. Skipping RLS after auth changes → tenant leakage risk
5. Querying encrypted columns directly → returns ciphertext, not plaintext
