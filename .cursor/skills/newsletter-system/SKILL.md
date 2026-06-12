---
name: newsletter-system
description: >-
  Architecture guide, development rules, and responsibility matrix for the Raivan Global
  newsletter intelligence pipeline. Use when modifying newsletter components (scraper,
  gatekeeper, synthesis passes, renderers, prompts, admin UI), adding data sources,
  tuning scoring weights, changing editorial voice, debugging newsletter output quality,
  or working on async generation / Vercel deployment.
---

# Raivan Global Newsletter System

Before modifying any newsletter component, read the full reference document for architectural context and the responsibility matrix:

- **Full reference**: [ai-service/NEWSLETTER_SYSTEM_SKILL.md](../../../ai-service/NEWSLETTER_SYSTEM_SKILL.md)

## Quick Architecture

```
Collection (scraper/) → Intelligence (newsletter/) → Presentation (render*.py + Next.js)
```

Three independent layers communicating through Pydantic models. Never cross layers for a single fix.

**Deployment split (Vercel-ready):** Next.js on Vercel only proxies short HTTP calls (<10 s). Long work (scraper, synthesis, Playwright PNG) runs on **persistent FastAPI** with PostgreSQL. Never run synthesis on Vercel serverless.

## Pipeline Summary

1. **Scrape** — 24 sources (NewsAPI + RSS + Playwright) → `scraper/pipeline.py` (background task via `POST /scraper/run`)
2. **Score** — 6-dimension Gemini Flash scoring → `scraper/gatekeeper.py` (quality gate: composite >= 0.6)
3. **Persist** — `threat_intel` table (PostgreSQL, `ON CONFLICT` upsert; `scraper_user` role)
4. **Cluster** — Pass 1: group into 3-5 themes → `newsletter/clustering.py` (physical-security bias in prompt)
5. **Enrich** — Pass 2: SITREP + CPP grounding + incident citations → `newsletter/enrichment.py`
6. **Compose** — Pass 3: editorial voice + 3 tiers + **bullet exec summary** → `newsletter/composer.py`
7. **Render** — PNG (metadata bar, segment tags, bullet intro), email, website, WhatsApp → `newsletter/render*.py`
8. **Store** — `newsletters` table with all formats
9. **Distribute** — Admin panel, LinkedIn cron, public `/intelligence` page

## Admin "Generate Now" (Async + Job Tracking)

Synthesis takes 2–5 min (3–5 Gemini passes + Playwright). Do **not** block HTTP until done.

```
Admin UI → POST /api/admin/newsletter?action=generate
         → FastAPI POST /newsletter/draft  (<1 s, returns { job_id, status: "pending" })
         → BackgroundTasks → create_newsletter_draft()
         → newsletter_generation_jobs row updated (pending → processing → completed|failed)
Admin UI polls GET ?action=status&jobId= every 3 s (max 5 min)
         → FastAPI GET /newsletter/jobs/{id}
         → On completed: refresh list, show "Draft ready: {title}"
```

| Component | File |
|---|---|
| Job repository | `newsletter/job_repository.py` |
| Job constants | `newsletter/constants.py` → `NEWSLETTER_JOB_*` |
| FastAPI routes | `routers/newsletter.py` → `draft_newsletter`, `get_generation_job` |
| Next.js proxy | `src/app/api/admin/newsletter/route.ts` |
| Admin polling | `src/app/admin/newsletter/_hooks/useNewsletterData.ts` |
| DB table | `newsletter_generation_jobs` (migration `13_newsletter_generation_jobs`) |

Weekly cron (`scheduled_weekly_newsletter`) calls `create_newsletter_draft()` directly — no job row.

## Sprint 8 Changes (June 2026)

### Quality tuning (prompts + PNG + fallbacks)

| Change | Where | Intent |
|---|---|---|
| Physical-security cluster bias | `CLUSTER_PROMPT` | ≥2 of 3–5 clusters must be CPP-01/03/06 (physical threats, access control, incident response) |
| Incident citations in situation | `ENRICH_PROMPT` | Situation field must name incident, date, location from source articles |
| Bullet executive summary | `COMPOSE_PROMPT` + `fallback_compose()` | 3–4 bullets citing specific incidents (not prose paragraph) |
| PNG metadata bar | `render.py` | Issue date + "Analysis of N sources" between tagline and title |
| Segment impact tags | `render.py` + `SEGMENT_SHORT_LABELS` | HNI / Enterprise / Critical Infra tags on theme cards |
| Bullet intro rendering | `render.py` → `_render_intro()` | Lines starting with `- ` → `<ul class="intro-bullets">`; plain text → `<div>` |
| Prompt contract tests | `tests/test_prompts.py` | Assert required instruction fragments in prompts |
| Draft integration test | `tests/test_newsletter.py` | `test_draft_route_gemini_path_png_has_quality_metadata` |

### Infrastructure fixes (carried from Sprint 7)

- **Scraper background task** — `POST /scraper/run` returns `{ status: "started" }` immediately
- **Datetime timezone** — `scraper_runs` timestamps stored as naive UTC for `TIMESTAMP WITHOUT TIME ZONE`
- **DB role isolation** — scraper uses `scraper_user` pool, not `app_user`
- **Gemini model** — `gemini-2.5-flash` (2.0-flash deprecated)

### Generate Now timeout fix

- Root cause: Next.js `GENERATE_TIMEOUT_MS = 60_000` vs 2–5 min pipeline
- Fix: background task + job tracking (not just a longer timeout)

## The Golden Rule

> Collection problems → fix in scraper. Intelligence problems → fix in synthesis. Presentation problems → fix in renderers. Never cross layers.

## Responsibility Matrix (Top Issues)

| Problem | Fix Here | NOT Here |
|---|---|---|
| Irrelevant articles | `scraper/gatekeeper.py` | Newsletter prompts |
| Weak analysis depth | `newsletter/enrichment.py` + `ENRICH_PROMPT` | Renderer |
| Wrong editorial voice | `COMPOSE_PROMPT` + `VOICE_GUIDELINES` | Scraper |
| Generic exec summary | `COMPOSE_PROMPT` (bullet format) + `fallback_compose()` | PNG CSS |
| Missing incident names in analysis | `ENRICH_PROMPT` situation field | Composer |
| Themes too cyber/geopolitical | `CLUSTER_PROMPT` physical-security bias | Gatekeeper weights |
| Broken email layout | `newsletter/render_email.py` | Prompts |
| Bad PNG image / missing metadata | `newsletter/render.py` | Composer |
| Generate Now times out | `routers/newsletter.py` + job tracking + admin poll | Increasing HTTP timeout |
| Not enough articles | `scraper/sources.yaml` | Synthesis |

See the full matrix (20+ entries) in the reference document, Section 5.

## Key Constants (SSOT)

- Scoring weights: `newsletter/constants.py` → `INTEL_SCORE_WEIGHTS`
- Quality threshold: `newsletter/constants.py` → `NEWSLETTER_QUALITY_THRESHOLD = 0.6`
- Segment short labels (PNG tags): `SEGMENT_SHORT_LABELS`
- Job lifecycle: `NEWSLETTER_JOB_PENDING | PROCESSING | COMPLETED | FAILED`
- Brand palette: `newsletter/constants.py` → `COLOR_*`
- Prompt templates: `newsletter/prompts.py` → `CLUSTER_PROMPT`, `ENRICH_PROMPT`, `COMPOSE_PROMPT`
- Voice guidelines: `newsletter/prompts.py` → `VOICE_GUIDELINES`
- UI strings: `src/config/newsletter-strings.ts` → `GENERATE_PENDING`, `GENERATE_COMPLETE`, `GENERATE_STILL_RUNNING`

## Mandatory Development Rules

1. Never bypass relevance scoring
2. Never add sources without classification in `sources.yaml`
3. Never modify prompts without regenerating and inspecting all 4 formats
4. All prompts use `string.Template` (not f-strings with user content)
5. All scraped content is `html.escape()`-d in renderers
6. Every Gemini call has a deterministic fallback
7. No file exceeds 300 lines
8. Tests verify intent (correct branch taken), not just return types
9. Admin long-running work uses BackgroundTasks + DB job rows — never block HTTP for synthesis
10. Prompt changes require `tests/test_prompts.py` contract tests updated

## Key Data Models

- `IntelScores` → 6-dimension article quality (in `scraper/models.py`)
- `ThemeCluster` → Pass 1 output (in `newsletter/models.py`)
- `EnrichedTheme` → Pass 2 output with SITREP structure (in `newsletter/models.py`)
- `NewsletterContent` → Final 3-tier output (in `newsletter/models.py`)
- `newsletter_generation_jobs` → async admin generate lifecycle (DB, mirrors `report_jobs`)

## Files to Read First

1. `newsletter/constants.py` — thresholds, weights, brand, job statuses
2. `newsletter/models.py` — every data model
3. `newsletter/prompts.py` — all Gemini prompts
4. `newsletter/synthesis.py` — orchestrator (connects the 3 passes)
5. `newsletter/job_repository.py` — generation job CRUD
6. `routers/newsletter.py` — draft route, job status, `create_newsletter_draft()`
7. `ai-service/NEWSLETTER_SYSTEM_SKILL.md` — full reference document
