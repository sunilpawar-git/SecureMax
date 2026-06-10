# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SecureMax Security Crawler — a physical security audit SaaS for HNIs and enterprises.
Users complete an AI-driven, flowchart-based questionnaire grounded in "CPP Seven Precis" (7 proprietary security PDFs), then receive a PDF audit report that surfaces loopholes and funnels them toward a physical on-site audit.
Admins run a web scraper that enriches the knowledge base and auto-posts to LinkedIn.

## Tech Stack

- **Frontend + API routes**: Next.js 16 (App Router), PWA-compliant
- **AI/LLM microservice**: Python FastAPI — handles Gemini API calls and pgvector similarity search
- **Database**: PostgreSQL + pgvector (embeddings of CPP Seven Precis)
- **Auth**: NextAuth.js v5 with Google OAuth (primary) and Microsoft Entra ID (enterprise SSO)
- **Report generation**: react-pdf
- **Web crawler**: Playwright (security news ingestion)
- **Social posting**: LinkedIn API (admin panel)
- **Payments**: Razorpay (report unlock)
- **AI models**: Gemini Flash (questionnaire speed), Gemini Pro (deep audit analysis)

## Development Commands

### Next.js Frontend

```bash
npm run dev          # start dev server (localhost:3000)
npm run build        # production build
npm run lint         # ESLint (0 warnings allowed)
npm run type-check   # tsc --noEmit
npm test             # Jest unit tests
npm run test:ci      # Jest with coverage (used in CI)
npm run format       # Prettier write
```

### Python FastAPI (AI service)

```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000   # dev server (localhost:8000)
ruff check .                             # lint (configured in pyproject.toml)
pytest                                   # run all tests
pytest tests/test_questionnaire.py -k "test_branch"   # run a single test
```

### Database

```bash
npx prisma migrate dev
npx prisma generate

# Seed CPP Seven Precis embeddings (run once after DB setup)
cd ai-service && python scripts/seed_cpp_embeddings.py

# Seed question graph from YAML into question_nodes table (idempotent)
cd ai-service && python scripts/seed_question_graph.py

# Validate question graph YAML without hitting the DB
python question-graph/validate.py
```

## Architecture

### Two-Service Design

The app is intentionally split. Next.js handles all user-facing concerns (auth, UI, API routes, PDF generation). The FastAPI service is isolated for anything touching Gemini or pgvector — this keeps AI logic testable independently and keeps the Node runtime lean.

```
User → Next.js (port 3000)
         ↓ internal HTTP (X-Service-Key header)
       FastAPI AI service (port 8000)
         ↓ pgvector queries
       PostgreSQL
```

All Next.js → FastAPI calls go through `src/lib/ai-service.ts` (`aiServiceFetch`), which attaches `X-Service-Key`. The FastAPI `ServiceAuthMiddleware` (`auth_middleware.py`) validates this key on every non-`/health` endpoint.

### Questionnaire Engine (Core)

The questionnaire is a directed graph. The SSOT is `question-graph/hni.yaml` and `question-graph/enterprise.yaml` — **edit YAML, then reseed; never edit the DB directly.** The seed script validates the graph before writing.

Each node defines `edges` with optional `condition` fields. The AI service (`questionnaire.py`) drives branching: deterministic for `condition: any`, Gemini-assisted for answer-dependent forks. Graph state is persisted to `AuditSession.currentNodeId` after every answer; each answer is written as an immutable `SessionEvent` row with the answer and AI reasoning both AES-encrypted at rest.

Two user tracks: `hni` (high net worth individuals, entry `hni_q1_property_type`) and `enterprise` (entry node in `enterprise.yaml`). Track is set on the `User` row at onboarding.

CPP Seven Precis domains (source of all questions):

- CPP-01: Physical Security (ESRM, 4 Ds: Deter/Detect/Delay/Deny, access control, perimeter)
- CPP-02: Business Principles (risk categories, leadership, decision-making)
- CPP-03: Crisis Management (BIA, BCM, emergency response, CMT)
- CPP-04: Investigations (objectivity, thoroughness, accuracy, timeliness)
- CPP-05: Information Security (IAP, threat categories, layered defence, OPSEC)
- CPP-06: Personnel Security (officer ops, patrol, access control, weapons policy)
- CPP-07: Security Management (ESRM cycle, stakeholders, operating environment)

### Audit Report Generation

After the questionnaire ends, `ai-service/report/` assembles findings ranked by severity (critical → high → medium → low). Each finding cites its CPP domain. The AI augments findings with current threat intelligence from the `threat_intel` table. The PDF bytes are AES-encrypted before being stored in `ReportArtifact.pdfEncrypted`. Next.js decrypts and streams the PDF to the user after Razorpay payment confirmation.

### Admin Panel

Separate Next.js route group `src/app/admin/` protected by role check in middleware. Admin triggers the Playwright scraper (`ai-service/routers/scraper.py`), reviews synthesized security briefings, and posts to LinkedIn. Every LinkedIn post is logged in `LinkedinPost` with status, timestamp, and platform.

### LinkedIn Direct Posting

Direct posting (`src/lib/admin/linkedin-post-service.ts`) targets the **company page** via the versioned Posts API (`POST https://api.linkedin.com/rest/posts` with `LinkedIn-Version` header). Never use the deprecated `v2/ugcPosts` endpoint. Requires env vars `LINKEDIN_ACCESS_TOKEN` (scope `w_organization_social`) and `LINKEDIN_ORG_ID` (numeric organization id). Both are server-side only — never serialized to the client.

**Known debt**: LinkedIn access tokens expire (~60 days) and there is no refresh flow. When posting starts failing with 401, generate a new token in the LinkedIn developer portal and update `LINKEDIN_ACCESS_TOKEN`.

### Admin Session Idle Timeout

The admin panel auto-signs-out after 30 minutes of inactivity via a client-side idle detector (`src/app/admin/_components/IdleLogout.tsx`, constants in `ADMIN_IDLE`). A warning appears 2 minutes before sign-out.

**Known debt (P4)**: this guard is client-side only (JavaScript can be bypassed); the NextAuth session itself still uses the global 24h maxAge. A proper server-side fix requires role-specific session maxAge via NextAuth session callbacks.

### Other Known Debt (P4)

- **Admin checklist view**: the admin Reports table intentionally has no checklist link. `/checklist/[sessionId]` is owner-scoped (FastAPI rejects non-owners) and progress lives in the client's localStorage, so an admin link always shows a broken/empty page. Needs server-persisted checklist progress + an admin-scoped endpoint before it can be surfaced (see `ReportsTable.tsx` TODO).
- **Landing page launch blockers**: `landing-strings.ts` ships placeholder testimonials and a placeholder WhatsApp number (`wa.me/919999999999`), both marked `TODO(launch-blocker)`. Replace with real content before pilot traffic.
- **Scraper failure alert latency**: scraper failures surface via the daily digest sweep (first admin visit to follow-up per UTC day), not at run time — DB-flag design, no FastAPI → Next.js callback. Add an immediate alert path only if a same-day signal becomes necessary.

### Key DB Tables

- `AuditSession` — one per questionnaire run; tracks `status`, `domainScores`, `moduleScores`, `paid`, `reportReady`
- `SessionEvent` — append-only audit trail; `answerEncrypted` + `aiReasoningEncrypted` columns; unique on `(sessionId, questionNodeId)`
- `CppChunk` — pgvector embeddings (`vector(3072)`) of CPP Seven Precis text, seeded from PDFs in `cpp-pdfs/`
- `ApiKey` — encrypted storage for third-party API keys; one active key per provider enforced by DB unique constraint

---

## Rules

These rules apply to every task unless explicitly overridden.
Bias: caution over speed on non-trivial work.

### Rule 1 — Think Before Coding

State assumptions explicitly. If uncertain, ask rather than guess. Stop when confused — name what's unclear.

### Rule 2 — Simplicity First

Minimum code that solves the problem. No features beyond what was asked. No abstractions for single-use code.

### Rule 3 — Surgical Changes

Touch only what you must. Don't "improve" adjacent code. Match existing style.

### Rule 4 — Goal-Driven Execution

Define success criteria before writing a line. Loop until verified. Don't follow steps blindly.

### Rule 5 — Use Gemini for Judgment, Code for Determinism

Use Gemini for: question flow decisions, audit finding classification, report narrative, security briefing synthesis.
Do NOT use it for: routing logic, retries, PDF layout, CRUD, data transforms. If code can answer, code answers.

### Rule 6 — Token Budgets Are Not Advisory

Per-task: 4,000 tokens. Per-session: 30,000 tokens. Surface the breach. Do not silently overrun.

### Rule 7 — Surface Conflicts, Don't Average Them

If CPP Seven Precis and AI inference contradict, the PDF wins. Flag the conflict in the audit report. Never blend contradicting sources into a vague finding.

### Rule 8 — Read Before You Write

Before adding a question, read the existing question schema and flow graph. Before adding a scraper source, check what the crawler already ingests.

### Rule 9 — Tests Verify Intent, Not Just Behavior

Questionnaire tests must assert that a specific answer causes the correct branch — not just that the function returns. A test that cannot fail when branching logic changes is wrong.

### Rule 10 — Checkpoint Every Significant Step

After each feature: state what was built, what was verified, what is next. If you lose track, stop and restate.

### Rule 11 — Match Codebase Conventions

Next.js follows App Router conventions. Python follows FastAPI patterns. Conformance > taste. Surface harmful conventions — don't fork silently.

### Rule 12 — Fail Loud

"Completed" is wrong if anything was skipped silently. If the scraper finds 0 results, log it — don't silently pass.

### Rule 13 — CPP Seven Precis Is the Knowledge Authority

Every questionnaire question and audit finding must be grounded in one of the 7 CPP domains before AI augmentation is added. Audit reports must cite source domain (e.g., "CPP-01: Physical Security"). AI can extend — not replace.

### Rule 14 — Security by Design Is Non-Negotiable

This product audits others' security — our own must be exemplary.

- Data encrypted at rest (AES-256) and in transit (TLS 1.3)
- OWASP Top 10 addressed before any feature ships
- No PII in logs; no secrets in code or git
- Google OAuth (primary) and Microsoft Entra ID (enterprise SSO) — no custom password auth, ever
- Audit session data is per-user isolated; no cross-tenant leakage
- Web crawler must not scrape behind authentication

### Rule 15 — The Audit Trail Is Sacred

Every session — questions asked, answers given, AI reasoning, findings generated — must be immutably logged with timestamps. The PDF is a summary; the DB log is the truth. Never delete or overwrite session data. Admin social posts must log what was posted, when, and to which platform.

### Rule 16 — Database Safety: Role-Based Access Control

Database is split by role to prevent accidental deletion or unauthorized writes:

- **ai_readonly** (SELECT only): Claude AI queries, analytics, read-only operations
- **app_user** (read + audit writes): FastAPI app, inserts/updates audit sessions, session events, reports
- **scraper_user** (threat_intel writes): Playwright scraper, updates threat intelligence only
- **db_admin** (full access): Emergencies, migrations, schema changes only

Never run `DELETE`, `DROP`, or `TRUNCATE` commands via shell. Backups run hourly to `/backups/`. See `ai-service/CLAUDE.md` for full role permissions.
