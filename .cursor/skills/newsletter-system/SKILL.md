---
name: newsletter-system
description: >-
  Architecture guide, development rules, and responsibility matrix for the Raivan Global
  newsletter intelligence pipeline. Use when modifying newsletter components (scraper,
  gatekeeper, synthesis passes, renderers, prompts, admin UI), adding data sources,
  tuning scoring weights, changing editorial voice, or debugging newsletter output quality.
---

# Raivan Global Newsletter System

Before modifying any newsletter component, read the full reference document for architectural context and the responsibility matrix:

- **Full reference**: [ai-service/NEWSLETTER_SYSTEM_SKILL.md](../../../ai-service/NEWSLETTER_SYSTEM_SKILL.md)

## Quick Architecture

```
Collection (scraper/) → Intelligence (newsletter/) → Presentation (render*.py + Next.js)
```

Three independent layers communicating through Pydantic models. Never cross layers for a single fix.

## Pipeline Summary

1. **Scrape** — 24 sources (NewsAPI + RSS + Playwright) → `scraper/pipeline.py`
2. **Score** — 6-dimension Gemini Flash scoring → `scraper/gatekeeper.py` (quality gate: composite >= 0.6)
3. **Persist** — `threat_intel` table (PostgreSQL, `ON CONFLICT` upsert)
4. **Cluster** — Pass 1: group into 3-5 themes → `newsletter/clustering.py`
5. **Enrich** — Pass 2: SITREP + CPP grounding → `newsletter/enrichment.py`
6. **Compose** — Pass 3: editorial voice + 3 tiers → `newsletter/composer.py`
7. **Render** — PNG, email HTML, website HTML, WhatsApp text → `newsletter/render*.py`
8. **Store** — `newsletters` table with all formats
9. **Distribute** — Admin panel, LinkedIn cron, public `/intelligence` page

## The Golden Rule

> Collection problems → fix in scraper. Intelligence problems → fix in synthesis. Presentation problems → fix in renderers. Never cross layers.

## Responsibility Matrix (Top Issues)

| Problem | Fix Here | NOT Here |
|---|---|---|
| Irrelevant articles | `scraper/gatekeeper.py` | Newsletter prompts |
| Weak analysis depth | `newsletter/enrichment.py` + `ENRICH_PROMPT` | Renderer |
| Wrong editorial voice | `COMPOSE_PROMPT` + `VOICE_GUIDELINES` | Scraper |
| Broken email layout | `newsletter/render_email.py` | Prompts |
| Bad PNG image | `newsletter/render.py` | Composer |
| Not enough articles | `scraper/sources.yaml` | Synthesis |

See the full matrix (20+ entries) in the reference document, Section 5.

## Key Constants (SSOT)

- Scoring weights: `newsletter/constants.py` → `INTEL_SCORE_WEIGHTS`
- Quality threshold: `newsletter/constants.py` → `NEWSLETTER_QUALITY_THRESHOLD = 0.6`
- Brand palette: `newsletter/constants.py` → `COLOR_*`
- Prompt templates: `newsletter/prompts.py` → `CLUSTER_PROMPT`, `ENRICH_PROMPT`, `COMPOSE_PROMPT`
- Voice guidelines: `newsletter/prompts.py` → `VOICE_GUIDELINES`
- UI strings: `src/config/newsletter-strings.ts`

## Mandatory Development Rules

1. Never bypass relevance scoring
2. Never add sources without classification in `sources.yaml`
3. Never modify prompts without regenerating and inspecting all 4 formats
4. All prompts use `string.Template` (not f-strings with user content)
5. All scraped content is `html.escape()`-d in renderers
6. Every Gemini call has a deterministic fallback
7. No file exceeds 300 lines
8. Tests verify intent (correct branch taken), not just return types

## Key Data Models

- `IntelScores` → 6-dimension article quality (in `scraper/models.py`)
- `ThemeCluster` → Pass 1 output (in `newsletter/models.py`)
- `EnrichedTheme` → Pass 2 output with SITREP structure (in `newsletter/models.py`)
- `NewsletterContent` → Final 3-tier output (in `newsletter/models.py`)

## Files to Read First

1. `newsletter/constants.py` — thresholds, weights, brand
2. `newsletter/models.py` — every data model
3. `newsletter/prompts.py` — all Gemini prompts
4. `newsletter/synthesis.py` — orchestrator (connects the 3 passes)
5. `routers/newsletter.py` — API route that triggers everything
6. `ai-service/NEWSLETTER_SYSTEM_SKILL.md` — full reference document
