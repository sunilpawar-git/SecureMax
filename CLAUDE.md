# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ProSecure Security Crawler — a physical security audit SaaS for HNIs and enterprises.
Users complete an AI-driven, flowchart-based questionnaire grounded in "CPP Seven Precis" (7 proprietary security PDFs), then receive a PDF audit report that surfaces loopholes and funnels them toward a physical on-site audit.
Admins run a web scraper that enriches the knowledge base and auto-posts to LinkedIn.

## Tech Stack

- **Frontend + API routes**: Next.js 14 (App Router), PWA-compliant
- **AI/LLM microservice**: Python FastAPI — handles Claude API calls and pgvector similarity search
- **Database**: PostgreSQL + pgvector (embeddings of CPP Seven Precis)
- **Auth**: NextAuth.js with Google OAuth only
- **Flowchart UI**: React Flow
- **Report generation**: react-pdf
- **Web crawler**: Playwright (security news ingestion)
- **Social posting**: LinkedIn API (admin panel)
- **AI models**: claude-haiku-4-5 (questionnaire speed), claude-sonnet-4-6 (deep audit analysis)

## Development Commands

### Next.js Frontend
```bash
npm run dev          # start dev server (localhost:3000)
npm run build        # production build
npm run lint         # ESLint check
npm run type-check   # tsc --noEmit
```

### Python FastAPI (AI service)
```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000   # dev server (localhost:8000)
pytest                                   # run all tests
pytest tests/test_questionnaire.py -k "test_branch"   # run a single test
```

### Database
```bash
# Apply migrations
npx prisma migrate dev
npx prisma generate

# Seed CPP Seven Precis embeddings (run once after DB setup)
cd ai-service && python scripts/seed_cpp_embeddings.py
```

## Architecture

### Two-Service Design
The app is intentionally split. Next.js handles all user-facing concerns (auth, UI, API routes, PDF generation). The FastAPI service is isolated for anything touching the Claude API or pgvector — this keeps AI logic testable independently and keeps the Node runtime lean.

```
User → Next.js (port 3000)
         ↓ internal HTTP
       FastAPI AI service (port 8000)
         ↓ pgvector queries
       PostgreSQL
```

### Questionnaire Engine (Core)
The questionnaire is not a static form — it is a directed graph. Each node is a question; edges are conditional on the user's answer. The AI service drives branching: it takes the current answer, queries pgvector for relevant CPP Seven Precis context, then calls the Claude API to decide the next question branch. The graph state lives in the user's session and is persisted to the DB after every answer.

CPP Seven Precis domains (source of all questions):
- CPP-01: Physical Security (ESRM, 4 Ds: Deter/Detect/Delay/Deny, access control, perimeter)
- CPP-02: Business Principles (risk categories, leadership, decision-making)
- CPP-03: Crisis Management (BIA, BCM, emergency response, CMT)
- CPP-04: Investigations (objectivity, thoroughness, accuracy, timeliness)
- CPP-05: Information Security (IAP, threat categories, layered defence, OPSEC)
- CPP-06: Personnel Security (officer ops, patrol, access control, weapons policy)
- CPP-07: Security Management (ESRM cycle, stakeholders, operating environment)

### Audit Report Generation
After the questionnaire ends, the FastAPI service assembles findings ranked by severity. Each finding cites its CPP domain (e.g., "CPP-01: Physical Security"). The AI augments findings with current threat intelligence from the scraper DB. Next.js renders the final PDF via react-pdf.

### Admin Panel
Separate Next.js route group `/admin` protected by role check in middleware. Admin triggers the Playwright scraper, reviews synthesized security briefings, and posts to LinkedIn. Scraper results are stored in a separate `threat_intel` table and used to enrich questionnaire context.

### PWA + Mobile Scalability
The Next.js app ships a service worker and web manifest. The questionnaire flowchart is designed with touch-first interaction. The FastAPI service is stateless so a future React Native app can call the same endpoints.

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

### Rule 5 — Use Claude API for Judgment, Code for Determinism
Use the Claude API for: question flow decisions, audit finding classification, report narrative, security briefing synthesis.
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
- Google OAuth only — no custom password auth, ever
- Audit session data is per-user isolated; no cross-tenant leakage
- Web crawler must not scrape behind authentication

### Rule 15 — The Audit Trail Is Sacred
Every session — questions asked, answers given, AI reasoning, findings generated — must be immutably logged with timestamps. The PDF is a summary; the DB log is the truth. Never delete or overwrite session data. Admin social posts must log what was posted, when, and to which platform.
