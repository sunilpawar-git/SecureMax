# Raivan Global Newsletter System — Skill Document

> **Status**: Living document. Update when the pipeline, prompts, or architecture change.
> **Last updated**: 12 June 2026 (Sprint 8 — quality tuning, async job tracking, Vercel-ready deployment)
> **Audience**: AI agents, developers, security team, editorial reviewers.

---

## 1. Business Mission

### Why the Newsletter Exists

Raivan Global is a physical security audit SaaS built by Indian Army Special Forces professionals. The company earns revenue when prospects complete a security audit questionnaire and pay for a detailed vulnerability report.

The newsletter exists to **build authority and generate qualified leads** by demonstrating security expertise *before* any sales conversation. Every issue should make the reader think: "these people understand my threat landscape — I should get their assessment."

### Target Audience

| Segment | Who They Are | What They Need |
|---|---|---|
| **HNIs** | Wealthy individuals, family offices, private estates | Residential security, personal protection, asset safeguarding |
| **Enterprises** | Corporates, institutions, large offices | Campus security, employee safety, access control, IP protection |
| **Critical Infrastructure** | Power plants, transport hubs, data centers, government | Perimeter defence, surveillance, emergency response, ESRM |

### Business Objectives

1. **Authority building** — Position Raivan Global as India's most credible physical security intelligence voice.
2. **Trust creation** — Demonstrate analytical depth before the prospect pays anything.
3. **Lead generation** — Every issue funnels toward a soft CTA: "Assess your security posture."
4. **Audit funnel** — The newsletter warms prospects who later complete the AI questionnaire and purchase a full audit report.
5. **LinkedIn presence** — The executive summary tier becomes the company page post, driving traffic.

### How the Newsletter Supports the Funnel

```
Newsletter lands in inbox / WhatsApp / LinkedIn feed
    → Reader sees relevant threat intelligence
        → Reader trusts Raivan Global's expertise
            → Reader clicks CTA / visits /intelligence
                → Reader starts the AI questionnaire
                    → Reader pays for the full audit report
                        → Raivan Global offers an on-site physical audit
```

The newsletter is the top of the funnel. It must demonstrate value, not extract it.

---

## 2. Current Newsletter Philosophy

### What the Newsletter IS

- A **threat intelligence briefing** — structured like a military SITREP (Situation, Assessment, Implications, Recommendations).
- A **security awareness publication** — educates the reader on emerging threats relevant to their segment.
- A **decision-support product** — gives actionable recommendations, not vague warnings.
- An **educational intelligence asset** — grounds every analysis in CPP Seven Precis methodology.

### What the Newsletter is NOT

- **Not a news dump** — articles are clustered into themes and analysed, not listed.
- **Not an RSS feed** — raw articles never appear; only synthesised intelligence does.
- **Not article summaries** — the output is original analysis *informed by* articles, not rewrites of them.
- **Not marketing copy** — authority is demonstrated through analysis quality, never through claims or sales language.

### Editorial Voice

The editorial voice is defined in `newsletter/prompts.py` → `VOICE_GUIDELINES`:

> "A decorated Special Forces officer briefing a boardroom."

**Language patterns**: operational vocabulary (threat vector, vulnerability window, exposure surface, countermeasure, layered defence, concentric rings, force multiplier).

**Confidence calibration**: "We assess with high confidence that...", "Indicators suggest...", "The pattern is consistent with..."

**Anti-patterns** (never do these):
- "In today's world", "It is important to note", "In an increasingly connected world"
- Exclamation marks
- Hedging with "might" or "could possibly"
- Salesy or promotional language

---

## 3. End-to-End Pipeline

### Pipeline Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATA COLLECTION LAYER                       │
│                                                                 │
│  NewsAPI (7 queries)  →  RSS (19 feeds)  →  Playwright (5 sites)│
│         ↓                     ↓                     ↓           │
│                    scraper/pipeline.py                           │
│                    (dedup, fetch, clean)                         │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                   INTELLIGENCE SCORING LAYER                    │
│                                                                 │
│  scraper/gatekeeper.py                                          │
│  ├── Gemini Flash: 6-dimension scoring per article              │
│  ├── Composite score = weighted sum                             │
│  └── Quality gate: composite >= 0.6 to pass                    │
│                                                                 │
│  Dimensions (weights in newsletter/constants.py):               │
│  physical_security_relevance (0.25)                             │
│  geographic_relevance        (0.20)                             │
│  threat_actionability        (0.20)                             │
│  educational_value           (0.15)                             │
│  recency_novelty             (0.10)                             │
│  audience_impact             (0.10)                             │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              PERSISTENCE LAYER (threat_intel table)              │
│                                                                 │
│  PostgreSQL: title, url, summary, domain_tags, industry_tags,   │
│  6 score columns, affected_segments, content_hash, embedding    │
│  ON CONFLICT (url) DO UPDATE (scores refresh on rescrape)       │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│               THREE-PASS SYNTHESIS ENGINE                       │
│                                                                 │
│  Pass 1 — CLUSTER (newsletter/clustering.py)                    │
│  ├── Input: scored articles (above quality gate)                │
│  ├── Engine: Gemini Flash                                       │
│  ├── Output: 3-5 ThemeCluster objects                           │
│  └── Fallback: group by primary domain_tag                      │
│                             ↓                                   │
│  Pass 2 — ENRICH (newsletter/enrichment.py)                     │
│  ├── Input: ThemeClusters + CPP chunks (pgvector retrieval)     │
│  ├── Engine: Gemini Pro                                         │
│  ├── Output: EnrichedTheme (SITREP + CPP citation + segments)   │
│  └── Fallback: passthrough with generic assessments             │
│                             ↓                                   │
│  Pass 3 — COMPOSE (newsletter/composer.py)                      │
│  ├── Input: EnrichedThemes + editorial voice guidelines         │
│  ├── Engine: Gemini Pro                                         │
│  ├── Output: NewsletterContent (3 tiers + CTA)                  │
│  └── Fallback: structured markdown from enriched themes         │
│                                                                 │
│  Orchestrator: newsletter/synthesis.py                           │
│  → synthesize_newsletter_pipeline(articles, gemini, cpp_retrieve)│
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  MULTI-FORMAT RENDERING LAYER                   │
│                                                                 │
│  newsletter/render.py          → PNG one-pager (Playwright)     │
│  newsletter/render_email.py    → Email HTML (responsive)        │
│  newsletter/render_website.py  → Website HTML (full analysis)   │
│  newsletter/render_whatsapp.py → WhatsApp plain text            │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    STORAGE & DISTRIBUTION                        │
│                                                                 │
│  newsletters table: all 4 formats + 3 content tiers stored      │
│                                                                 │
│  Distribution channels:                                         │
│  ├── LinkedIn company page (PNG + executive_summary as caption)  │
│  ├── WhatsApp broadcast (whatsapp_text)                         │
│  ├── Email campaign (email_html)                                │
│  ├── Website /intelligence (website_html via Next.js SSR)       │
│  └── Admin panel (preview, copy, download all formats)          │
└─────────────────────────────────────────────────────────────────┘
```

### Pipeline Timing (APScheduler Cron)

| Job | Schedule (UTC) | Schedule (IST) | What It Does |
|---|---|---|---|
| `daily_scraper` | 02:30 daily | 08:00 IST | Scrape all sources, score, persist |
| `weekly_newsletter` | Mon 03:00 | Mon 08:30 IST | Draft newsletter from last 7 days of articles |
| `weekly_linkedin_briefing` | Mon 04:00 | Mon 09:30 IST | Derive LinkedIn post from newsletter (fallback: threat_intel digest) |

**Admin-triggered scraper**: The admin panel's "Run Scraper Now" button calls `POST /api/admin/scraper` → FastAPI `/scraper/run`. Since Sprint 7, this runs in a **FastAPI background task**, returning `{"status": "started"}` immediately. Admin refreshes after ~2 minutes. The background task continues even if the admin leaves the page.

**Admin-triggered newsletter**: "Generate Now" calls `POST /api/admin/newsletter?action=generate` → FastAPI `POST /newsletter/draft`. Since Sprint 8, this:

1. Pre-checks eligible articles (`relevance_score >= 0.6`, last N days)
2. Creates a `newsletter_generation_jobs` row (`status: pending`)
3. Returns `{"job_id": "...", "status": "pending"}` in <1 s
4. Runs `create_newsletter_draft()` in a **BackgroundTask** (2–5 min)
5. Updates job → `processing` → `completed` (with `newsletter_id`, `newsletter_title`) or `failed` (with `error_message`)

The admin UI polls `GET /api/admin/newsletter?action=status&jobId=` every 3 s (max 5 min). Each poll proxies to `GET /newsletter/jobs/{id}` — a short request safe for Vercel serverless.

**Weekly cron** (`scheduled_weekly_newsletter`) calls `create_newsletter_draft()` directly — no job row needed.

### Deployment Architecture (Vercel-Ready)

```
┌─────────────────────────┐         ┌──────────────────────────────┐
│  Vercel (Next.js)       │  short  │  Persistent FastAPI host      │
│  - Admin UI             │  HTTP   │  - Scraper pipeline           │
│  - POST generate (<1s)  │ ──────► │  - Newsletter synthesis       │
│  - GET job status (<1s) │         │  - Playwright PNG render      │
│  - List / publish       │         │  - Weekly cron jobs           │
└─────────────────────────┘         └──────────────┬───────────────┘
                                                   │
                                        ┌──────────▼──────────┐
                                        │  PostgreSQL          │
                                        │  threat_intel        │
                                        │  newsletters         │
                                        │  newsletter_generation_jobs │
                                        └─────────────────────┘
```

**Rules for Vercel migration (~6 months):**
- Vercel hosts Next.js only. Set `AI_SERVICE_URL` + `AI_SERVICE_KEY` env vars.
- FastAPI must run on persistent compute (Railway, Fly, Cloud Run with min instances, VPS).
- Do **not** put Gemini credentials on Vercel — all Gemini calls stay in FastAPI.
- Do **not** run newsletter synthesis or Playwright on Vercel serverless (60 s hard limit on Pro).
- Job polling pattern mirrors `report_jobs` — proven for long-running async work.

---

## 4. Current System Components

### 4.1 Scraper (`scraper/`)

**Purpose**: Collect security news from multiple source types, deduplicate, and persist scored articles.

| File | Role |
|---|---|
| `sources.yaml` | SSOT for all data sources (7 NewsAPI queries, 19 RSS feeds, 5 Playwright targets) |
| `pipeline.py` | Orchestrates fetch → dedup → process → persist. Exports `run_scraper_pipeline()` and `get_stored_articles()` |
| `models.py` | `RawArticle`, `ProcessedArticle`, `IntelScores` Pydantic models |
| `gatekeeper.py` | 6-dimension Gemini Flash scoring. `score_article()`, `compute_composite_score()`, `passes_quality_gate()` |
| `dedup.py` | Content-hash and URL-based deduplication |

**Inputs**: External web sources (NewsAPI, RSS feeds, Playwright-scraped HTML).
**Outputs**: Scored, deduplicated rows in `threat_intel` table.
**Key threshold**: `NEWSLETTER_QUALITY_THRESHOLD = 0.6` (articles below this are stored but excluded from newsletters).

**Database Role**: The scraper pipeline runs via a dedicated `scraper_user` PostgreSQL role pool (initialized in `main.py` via `init_scraper_pool()`). This role has INSERT/UPDATE/DELETE permissions on `threat_intel` and `scraper_runs`, while the default `app_user` role does not. This isolation prevents accidental data corruption from non-scraper application code.

**Future improvements**:
- Add per-source caching (cache RSS feed responses for 1 hour to avoid repeated fetches during testing)
- Add geographic tagging at source level
- Expand Indian regional language sources (Hindi/vernacular)
- Add CERT-In advisory scraping (no RSS; requires Playwright)
- Add BIS standards update monitoring

### 4.2 Intelligence Scoring (`scraper/gatekeeper.py`)

**Purpose**: Rate every article across 6 dimensions using Gemini Flash, producing a composite score that gates newsletter inclusion.

**6 Scoring Dimensions** (weights in `newsletter/constants.py`):

| Dimension | Weight | What It Measures |
|---|---|---|
| `physical_security_relevance` | 0.25 | How relevant to physical (not just cyber) security |
| `geographic_relevance` | 0.20 | Relevance to India and Raivan's operating regions |
| `threat_actionability` | 0.20 | Can the reader act on this information? |
| `educational_value` | 0.15 | Does this teach a security principle? |
| `recency_novelty` | 0.10 | Is this new information vs. already known? |
| `audience_impact` | 0.10 | Severity of impact on target segments |

**Fallback**: If Gemini fails, a deterministic keyword-based scorer runs (keyword hit ratios, India-term detection, action-verb patterns).

**Future improvements**:
- Fine-tune weights based on engagement analytics
- Add source credibility weighting
- Implement human feedback loop for score calibration

### 4.3 CPP Knowledge Base (`cpp_repository.py`)

**Purpose**: Retrieve relevant CPP Seven Precis chunks via pgvector similarity search. Grounds every newsletter theme in authoritative methodology.

**How it connects**: Pass 2 (enrichment) calls `get_relevant_chunks()` with the theme summary. The returned CPP text is injected into the Gemini Pro prompt as authoritative context, ensuring the assessment cites real CPP methodology rather than hallucinating it.

**7 CPP Domains**:

| Domain | Topic |
|---|---|
| CPP-01 | Physical Security (ESRM, 4 Ds, access control, perimeter) |
| CPP-02 | Business Principles (risk categories, leadership) |
| CPP-03 | Crisis Management (BIA, BCM, emergency response) |
| CPP-04 | Investigations (objectivity, thoroughness, accuracy) |
| CPP-05 | Information Security (IAP, layered defence, OPSEC) |
| CPP-06 | Personnel Security (officer ops, patrol, weapons) |
| CPP-07 | Security Management (ESRM cycle, stakeholders) |

**Future improvements**:
- Expand CPP corpus with case studies
- Add vector similarity threshold to reduce irrelevant chunk injection

### 4.4 Three-Pass Synthesis Engine (`newsletter/`)

**Purpose**: Transform raw scored articles into structured intelligence analysis across three Gemini passes.

#### Pass 1 — Cluster (`newsletter/clustering.py`)

- **Input**: List of article dicts (id, title, summary, domain_tags, affected_segments)
- **Engine**: Gemini Flash
- **Prompt**: `CLUSTER_PROMPT` in `newsletter/prompts.py`
- **Output**: 3-5 `ThemeCluster` objects (theme_title, article_ids, primary_domain)
- **Fallback**: Group articles by primary `domain_tag`
- **Sprint 8 bias**: `CLUSTER_PROMPT` requires at least 2 of 3–5 clusters to relate directly to operational physical security (CPP-01, CPP-03, CPP-06). Purely economic/geopolitical themes are deprioritised unless they imply a physical countermeasure.

#### Pass 2 — Enrich (`newsletter/enrichment.py`)

- **Input**: ThemeClusters + original articles + CPP chunks (via `cpp_retrieve` callback)
- **Engine**: Gemini Pro
- **Prompt**: `ENRICH_PROMPT` in `newsletter/prompts.py`
- **Output**: `EnrichedTheme` objects (SITREP structure: situation, assessment, implications, recommendation + CPP citation + segment impacts)
- **Fallback**: Passthrough with generic assessments
- **Sprint 8 contract**: `situation` must cite at least one specific incident by name, date, and location from source articles. `recommendation` must name a concrete control/protocol grounded in the incident and CPP context.

#### Pass 3 — Compose (`newsletter/composer.py`)

- **Input**: EnrichedThemes + editorial voice guidelines + brand positioning
- **Engine**: Gemini Pro
- **Prompt**: `COMPOSE_PROMPT` in `newsletter/prompts.py`
- **Output**: `NewsletterContent` with three content tiers:
  - `executive_summary` — **3–4 bullet points** (each cites a specific incident/threat by name; LinkedIn, WhatsApp, PNG intro)
  - `intelligence_briefing` — ~1000 words (email)
  - `full_analysis` — ~2000 words (website)
  - Plus: `title`, `commanders_note`, `cta_soft`, `themes`
- **Fallback**: `fallback_compose()` emits bullet-format exec summary (`- ` prefix per line), not numbered prose

#### Orchestrator (`newsletter/synthesis.py`)

Single function `synthesize_newsletter_pipeline(articles, gemini, cpp_retrieve)` that calls Pass 1 → Pass 2 → Pass 3 in sequence.

**Future improvements**:
- Add Pass 0: trend detection injection (newsletter/trends.py exists, not yet wired)
- Add Pass 0: historical cross-referencing (newsletter/historical.py exists, not yet wired)
- Implement feedback-driven prompt tuning

### 4.5 Multi-Format Rendering (`newsletter/render*.py`)

**Purpose**: Transform `NewsletterContent` into 4 distribution-ready formats.

| Renderer | File | Output | Key Design Decision |
|---|---|---|---|
| **PNG** | `render.py` | 1080px-wide branded image | `full_page=True` Playwright screenshot; metadata bar (date + source count); segment tags on theme cards; bullet exec summary via `_render_intro()` |
| **Email** | `render_email.py` | Responsive HTML email | 600px max-width; intelligence_briefing tier as main body; executive_summary as preview bar |
| **Website** | `render_website.py` | Full HTML article | full_analysis tier as main content; semantic HTML for SEO |
| **WhatsApp** | `render_whatsapp.py` | Plain text with `*bold*` formatting | 4000-char guard; executive_summary + themed bullets |

All renderers:
- Accept `NewsletterContent` as input
- HTML-escape all article-derived text (scraped content is untrusted)
- Use brand constants from `newsletter/constants.py`

**Future improvements**:
- Add PDF renderer for downloadable briefings
- Improve PNG layout for Instagram Stories format (9:16)
- Add dark/light theme toggle for website HTML

### 4.6 Distribution Layer

#### FastAPI Side (`routers/newsletter.py`)

- `create_newsletter_draft()` — runs synthesis + all 4 renderers, stores everything in `newsletters` table. Returns `{newsletter_id, title}`.
- `draft_newsletter()` — admin "Generate Now": creates job row, enqueues background task, returns `{job_id, status: "pending"}` immediately
- `get_generation_job()` — `GET /newsletter/jobs/{id}` for status polling
- Called by: weekly cron (direct) + admin panel (async via job)

#### Job Repository (`newsletter/job_repository.py`)

Mirrors `report_repository.py` pattern:

| Function | Purpose |
|---|---|
| `create_job(conn, days)` | Insert `pending` row, return UUID |
| `get_job(conn, job_id)` | Fetch job by ID |
| `update_job_status(conn, job_id, status, error_message?)` | Transition lifecycle |
| `complete_job(conn, job_id, newsletter_id, newsletter_title)` | Mark `completed` with output refs |

Job statuses (SSOT in `newsletter/constants.py`): `pending` → `processing` → `completed` | `failed`

#### Next.js Admin Panel (`src/app/admin/newsletter/`)

- **Page**: Lists all newsletters (newest first), "Generate Now" button, notice/error banners
- **NewsletterCard**: Preview thumbnail, status badge, platform post results, action buttons
- **Actions**: Publish (to LinkedIn/X/Facebook/Instagram), Copy WhatsApp, Preview Email, Download PNG, Delete
- **PublishModal**: Platform selector with configuration check, caption editor, per-platform results
- **Formats route**: `GET /api/admin/newsletter/[id]/formats?type=email|whatsapp` for lazy-loaded format access
- **MVVM**: `_hooks/useNewsletterData.ts` (ViewModel: list, generate+poll, delete, copy, email) → `_components/` (View, no fetch)
- **Generate flow**: POST generate → poll status every 3 s → refresh list on `completed` or show `error_message` on `failed`

#### Next.js API (`src/app/api/admin/newsletter/route.ts`)

| Method | Query | Action |
|---|---|---|
| GET | (none) | List newsletters + platform key status |
| GET | `action=status&jobId=` | Proxy to FastAPI job status |
| POST | `action=generate` | Enqueue draft, return `job_id` |
| DELETE | `id=` | Soft-delete newsletter |

#### Public Website (`src/app/intelligence/page.tsx`)

- Server-rendered page showing the latest published newsletter's `website_html`
- Only shows newsletters with `status = 'published'`
- Revalidates every hour (`revalidate = 3600`)

#### LinkedIn Cron (`main.py` → `scheduled_weekly_briefing`)

- Runs 1 hour after newsletter cron (04:00 UTC)
- Derives LinkedIn post from latest newsletter's `executive_summary`
- Fallback: if no recent newsletter exists, synthesises a digest from top-5 threat_intel articles (deterministic, no Gemini)

---

## 5. Responsibility Matrix

This is the most important section for future development. When you want to improve the newsletter, **first identify which layer owns the problem**, then implement the fix in that layer.

### Decision Matrix

| Problem | Fix In This Layer | NOT In This Layer | Why |
|---|---|---|---|
| **Articles are irrelevant** | `scraper/gatekeeper.py` (scoring weights, Gemini prompt) | Newsletter prompts | Quality filtering happens upstream; the newsletter should never see bad articles |
| **Articles are stale / not enough** | `scraper/sources.yaml` (add sources, expand queries) | Newsletter synthesis | Collection is the scraper's job; the newsletter works with what it receives |
| **Scoring is inaccurate** | `scraper/gatekeeper.py` + `newsletter/constants.py` (weights) | Renderer or route | Scoring logic is isolated in the gatekeeper; weights are SSOT in constants |
| **Themes are poorly grouped** | `newsletter/clustering.py` + `CLUSTER_PROMPT` in `prompts.py` | Enrichment or composer | Pass 1 owns theme grouping; downstream passes consume what Pass 1 produces |
| **Analysis lacks depth** | `newsletter/enrichment.py` + `ENRICH_PROMPT` in `prompts.py` | Composer or renderer | Pass 2 owns the analytical assessment; Pass 3 just composes the voice |
| **CPP grounding is weak** | `cpp_repository.py` (retrieval) + `ENRICH_PROMPT` (injection) | Composer or any renderer | CPP context is injected in Pass 2; if chunks are poor, fix retrieval not prompts |
| **Editorial voice is wrong** | `COMPOSE_PROMPT` + `VOICE_GUIDELINES` in `prompts.py` | Enrichment or clustering | Voice is Pass 3's job; earlier passes produce raw intelligence, not prose |
| **Brand messaging is weak** | `BRAND_POSITIONING` + `COMPOSE_PROMPT` in `prompts.py` | Scraper or gatekeeper | Brand is a presentation concern, not a data collection concern |
| **CTA is ineffective** | `newsletter/composer.py` (fallback CTA) + `COMPOSE_PROMPT` | Renderer | CTA text is generated in Pass 3; renderers just place it |
| **Email layout is broken** | `newsletter/render_email.py` | Prompts or synthesis | Rendering is presentation; synthesis produces content, not HTML |
| **PNG image looks bad** | `newsletter/render.py` (CSS, template) | Prompts or composer | PNG layout is CSS; content comes from the synthesis pipeline |
| **WhatsApp text is too long** | `newsletter/render_whatsapp.py` (truncation logic) | Composer | The 4000-char guard is the renderer's responsibility |
| **Website page is ugly** | `newsletter/render_website.py` or `src/app/intelligence/page.tsx` | Python pipeline | Website rendering is HTML/CSS; content comes from the pipeline |
| **LinkedIn post is bad** | `main.py` (`scheduled_weekly_briefing`) + `COMPOSE_PROMPT` | Scraper or renderer | LinkedIn uses executive_summary; if that's bad, fix composition |
| **Newsletter generation fails** | `routers/newsletter.py` + `newsletter/job_repository.py` (job status, error_message) | Individual pass modules | The route orchestrates; failures surface in job row, not silent 503s |
| **Generate Now HTTP timeout** | Background task + job polling (not longer timeout) | Vercel serverless synthesis | Synthesis is 2–5 min; HTTP must return immediately |
| **Exec summary is generic prose** | `COMPOSE_PROMPT` (bullet format) + `fallback_compose()` | PNG renderer | Content is Pass 3's job; renderer only formats bullets |
| **PNG missing date/source count** | `render.py` metadata bar | Prompts | Presentation layer owns layout |
| **PNG missing segment tags** | `render.py` + `SEGMENT_SHORT_LABELS` | Enrichment | Tags render from `segment_impact` fields populated in Pass 2 |
| **Duplicate articles appear** | `scraper/dedup.py` (content_hash, URL dedup) | Newsletter synthesis | Dedup is scraper's responsibility; synthesis assumes clean input |
| **Wrong CPP domain assigned** | `CLUSTER_PROMPT` (asks for CPP domain) + `ENRICH_PROMPT` | Renderer | Domain assignment happens during clustering and enrichment |
| **Segment impacts are generic** | `ENRICH_PROMPT` (segment rubric) + `newsletter/constants.py` (segment labels) | Composer | Segment analysis is Pass 2's job |

### The Golden Rule

> **Collection problems → fix in scraper. Intelligence problems → fix in synthesis. Presentation problems → fix in renderers. Never cross layers.**

---

## 6. Quality Framework

### How to Judge Newsletter Quality

Score each dimension 1-5. A world-class newsletter scores 4+ on every dimension.

| Dimension | 1 (Poor) | 3 (Adequate) | 5 (Excellent) |
|---|---|---|---|
| **Relevance** | Generic global news unrelated to physical security | Mix of relevant and tangential articles | Every theme directly affects physical security for Indian audiences |
| **Authority** | Generic AI summaries with no methodology | References security frameworks vaguely | Cites specific CPP principles with operational vocabulary |
| **Intelligence Value** | Restates headlines | Provides basic threat context | Reveals non-obvious patterns across multiple incidents |
| **Actionability** | "Be careful" | "Review your security" | "Implement X countermeasure for Y threat vector at Z facility type" |
| **Reader Engagement** | Wall of text, no structure | Clear sections, some repetition | Compelling SITREP structure that pulls the reader through |
| **Security Education** | No learning value | Explains one concept | Reader learns a new security methodology or framework principle |
| **Conversion Potential** | No CTA or aggressive sales | CTA exists but feels forced | Natural "assess your posture" invitation that follows logically from the analysis |

### Current Baseline Assessment (Sprint 8 — post quality tuning)

| Dimension | Score | Sprint 8 Improvement |
|---|---|---|
| Relevance | 4+ | `CLUSTER_PROMPT` physical-security bias; expanded source coverage |
| Authority | 4 | Incident citations in `ENRICH_PROMPT`; CPP grounding in recommendations |
| Intelligence Value | 4 | Bullet exec summary forces named-incident synthesis across themes |
| Actionability | 4+ | Recommendations must name specific controls grounded in cited incidents |
| Reader Engagement | 4 | PNG metadata bar, segment tags, bullet intro layout |
| Security Education | 3.5 | Segment impact tags visible on PNG; deeper CPP explanation still a gap |
| Conversion Potential | 3.5 | CTA present and non-salesy; could tie more directly to specific threats |

**Remaining gaps**: trend detection (`trends.py`) and historical cross-ref (`historical.py`) still unwired. Cross-incident pattern recognition across weeks is the next intelligence-value lever.

---

## 7. Newsletter Generation Framework

### Input Contract

`create_newsletter_draft()` in `routers/newsletter.py` expects:

1. **Database pool** — asyncpg connection to PostgreSQL
2. **Gemini client** — configured with API key from settings
3. **Days parameter** — how many days of articles to include (default: 7)

It queries `threat_intel` for articles where:
- `soft_deleted = FALSE`
- `relevance_score >= 0.6` (quality gate)
- `scraped_at >= NOW() - INTERVAL '{days} days'`
- Ordered by `relevance_score DESC`, limited to **15** (`MAX_NEWSLETTER_ARTICLES`)

### Admin Async Contract (Sprint 8)

`draft_newsletter()` pre-checks article count (422 if zero), then:

1. `job_repo.create_job(conn, days=7)` → `job_id`
2. `background_tasks.add_task(_background_draft, pool, gemini, days, job_id)`
3. Returns `{"job_id": "...", "status": "pending"}` (HTTP 201)

`_background_draft()` lifecycle:
- `pending` → `processing` (before synthesis)
- `processing` → `completed` (stores `newsletter_id`, `newsletter_title`) or `failed` (stores `error_message`)

Poll response shape (`GET /newsletter/jobs/{id}`):
```json
{
  "job_id": "uuid",
  "status": "pending|processing|completed|failed",
  "newsletter_id": null,
  "title": null,
  "error_message": null
}
```

### Processing Pipeline

1. **Article preparation**: Parse `domain_tags` and `affected_segments` from JSONB
2. **CPP retrieval wiring**: Create `_cpp_retrieve` closure that calls `get_relevant_chunks`
3. **Three-pass synthesis**: `synthesize_newsletter_pipeline(articles, gemini, cpp_retrieve)`
4. **Multi-format rendering**: All 4 renderers run on the `NewsletterContent` result
5. **Persistence**: All formats + content tiers stored in `newsletters` row

### Output Structure (`NewsletterContent` model)

```python
class NewsletterContent(BaseModel):
    title: str                    # Full title (no length cap)
    issue_date: str               # e.g. "11 June 2026"
    executive_summary: str        # 3-4 bullet points (lines starting "- ") — LinkedIn, WhatsApp, PNG
    intelligence_briefing: str    # ~1000 words — email
    full_analysis: str            # ~2000 words — website
    commanders_note: str          # 1-2 paragraphs — personal authority voice
    cta_soft: str                 # Natural CTA (never salesy)
    cta_audit_link: str           # Link to /security-audit
    themes: list[EnrichedTheme]   # 3-5 enriched themes with SITREP structure
```

### CTA Logic

The CTA is generated by Gemini in Pass 3 via `COMPOSE_PROMPT`. If Gemini fails, `fallback_compose()` sets:
- `cta_soft = "Is your organization prepared? Book a professional security audit."`
- `cta_audit_link = "/security-audit"`

The CTA should follow naturally from the week's threat analysis — e.g., "Given the escalation in AI supply chain attacks, a validated assessment of your security framework is a critical first step."

### Brand Integration

Brand elements are defined in `newsletter/constants.py`:
- `BRAND_NAME = "Raivan Global"`
- `BRAND_TAGLINE = "Security Consulting — Weekly Threat Intelligence"`
- `BRAND_SIGN_OFF = "Raivan Global — Securing What Matters"`
- Color palette: `#0f172a` (bg), `#f59e0b` (accent), `#f1f5f9` (text)

Brand positioning is defined in `newsletter/prompts.py` → `BRAND_POSITIONING` and injected into the Pass 3 composition prompt.

---

## 8. Future Roadmap

### Immediate (Next Sprint)

1. **Wire trend detection** — `newsletter/trends.py` exists but is not yet called in the synthesis pipeline. Inject 7/30/90-day trend signals into Pass 2 enrichment to surface recurring patterns.
2. **Wire historical cross-referencing** — `newsletter/historical.py` exists but is not yet called. Query similar past incidents via pgvector during enrichment.
3. **Source quality monitoring** — Track per-source success/failure rates in the scraper. Alert on dead feeds.
4. ~~**Prompt iteration (exec summary)**~~ — Done Sprint 8: bullet format, incident citations, physical-security cluster bias.
5. **Vercel migration prep** — Deploy FastAPI to persistent host; point Vercel `AI_SERVICE_URL` at it. Verify job polling works end-to-end in production.

### Mid-Term (3-6 Months)

5. **Engagement analytics** — Track which newsletter themes get clicks/reads. Feed this back into scoring weights.
6. **Segment-specific newsletters** — Generate variant newsletters tailored per segment (HNI vs Enterprise vs Critical Infrastructure) rather than one newsletter with segment callouts.
7. **PDF briefing format** — Downloadable PDF version for enterprise CISOs who prefer printable reports.
8. **Scheduled email delivery** — Integrate with Resend (already used for lead emails) to auto-send the newsletter to subscribers.
9. **Regional language support** — Hindi executive summaries for Indian HNI audience.
10. **Source expansion** — CAPSI added (Playwright). Still needed: CERT-In advisories (no RSS), BIS standards updates.

### Long-Term Vision (World-Class Intelligence Platform)

11. **Real-time alerting** — Push notifications for high-severity threats (score > 0.9) outside the weekly cadence.
12. **Interactive intelligence dashboard** — Web portal where subscribers explore threats by segment, domain, and time window.
13. **Proprietary intelligence** — Incorporate Raivan's on-site audit findings (anonymised) as exclusive intelligence data.
14. **Client-specific briefings** — Paid subscribers receive briefings filtered to their specific facility types and locations.
15. **Human editorial layer** — Security professionals review and annotate AI-generated content before publication.

---

## 9. Anti-Patterns

Future developers must avoid these mistakes:

### Content Anti-Patterns

1. **Stuffing every article into the newsletter** — The quality gate exists for a reason. If 40 articles pass, the clustering pass should still produce only 3-5 themes. More themes = less depth per theme.

2. **Article-by-article reporting** — The newsletter is NOT "Article 1: X happened. Article 2: Y happened." It clusters articles into themes and synthesises patterns across them.

3. **Excessive marketing language** — The CTA should be one sentence at the end. The body is intelligence analysis, not a pitch deck. If the newsletter reads like marketing, the voice guidelines need tightening in `prompts.py`.

4. **Generic AI summaries** — "Security is important and organizations should be careful" adds zero value. Every sentence should contain specific information: a named threat, a concrete countermeasure, a CPP principle.

### Architecture Anti-Patterns

5. **Fixing collection problems in the prompt layer** — If articles are irrelevant, fix the scraper's quality gate or add better sources. Do not try to make the newsletter prompt "ignore bad articles" — it should never see them.

6. **Duplicating scoring systems** — There is one scorer: `scraper/gatekeeper.py` with weights in `newsletter/constants.py`. Do not create a second scorer in the newsletter layer. If scoring needs improvement, improve the one that exists.

7. **Hardcoding strings in renderers** — All brand strings, color tokens, and labels live in `newsletter/constants.py` or `src/config/newsletter-strings.ts`. Renderers must import, not define.

8. **Putting data-fetching in View components** — The admin newsletter page uses MVVM. `_hooks/useNewsletterData.ts` owns all data fetching. `_components/` are pure views with callbacks. Do not add `fetch()` calls inside components.

9. **Bypassing the quality gate** — Never set `NEWSLETTER_QUALITY_THRESHOLD` to 0 to "get more articles." Instead, improve source coverage or tune scoring weights.

10. **Modifying prompts without testing** — Every prompt change can cascade through the entire output. After changing any prompt in `prompts.py`, update `tests/test_prompts.py` contract tests, regenerate a newsletter, and visually inspect all 4 formats.

11. **Blocking HTTP for synthesis** — Newsletter generation takes 2–5 minutes. Never await `create_newsletter_draft()` in the request handler. Use BackgroundTasks + `newsletter_generation_jobs` (same pattern as `report_jobs` and scraper background run).

12. **Running synthesis on Vercel serverless** — Vercel Pro has a 60 s function timeout. Synthesis, Playwright PNG, and scraper must stay on persistent FastAPI. Vercel only proxies short poll requests.

---

## 10. Development Rules

These are mandatory for all future newsletter work:

1. **Never bypass relevance scoring.** Every article must pass through `gatekeeper.py` before it can appear in a newsletter.

2. **Never add sources without classification.** Every new entry in `sources.yaml` must have a name, type, and (for Playwright) validated selectors.

3. **Never modify a prompt without updating this document.** If you change `CLUSTER_PROMPT`, `ENRICH_PROMPT`, or `COMPOSE_PROMPT`, document the change and rationale here.

4. **Preserve layer separation.** Collection → Intelligence → Presentation. Changes must happen in the correct layer (see the Responsibility Matrix).

5. **All prompts use `string.Template`.** Never use f-strings with user/scraped content in prompts. The `$variable` substitution in `string.Template` prevents prompt injection.

6. **All scraped content is HTML-escaped in renderers.** Every renderer uses `html.escape()` on all article-derived text. This is non-negotiable per Rule 14 (Security by Design).

7. **Every Gemini call has a deterministic fallback.** If Gemini fails, the newsletter must still be generated — with lower quality, not with an error. Each pass has its own fallback function.

8. **Constants are SSOT.** Scoring weights in `newsletter/constants.py`. Brand palette in `newsletter/constants.py`. UI strings in `src/config/newsletter-strings.ts`. Prompt templates in `newsletter/prompts.py`.

9. **Tests verify intent, not just behavior.** A clustering test must assert that articles about the same theme end up in the same cluster — not just that the function returns a list.

10. **No file exceeds 300 lines.** If a file approaches this limit, split it. The newsletter package has 12+ files specifically because of this rule.

11. **Long-running admin work uses jobs.** Admin "Generate Now" must create a `newsletter_generation_jobs` row and return immediately. The UI polls until `completed` or `failed`. Never increase HTTP timeouts as a fix.

12. **Prompt contract tests are mandatory.** `tests/test_prompts.py` asserts required instruction fragments in `CLUSTER_PROMPT`, `ENRICH_PROMPT`, and `COMPOSE_PROMPT`. Update when prompts change.

---

## 11. AI Context Preservation

### How Future AI Sessions Should Think About This System

If you are an AI agent working on the Raivan Global newsletter system, read this section before writing any code.

#### Architectural Philosophy

The system is deliberately split into **three independent layers** that communicate through well-defined data models:

```
Collection (scraper/) → Intelligence (newsletter/) → Presentation (render*.py + Next.js)
```

Each layer can be improved independently. A change in the scraper should not require changes in the renderer. A change in the editorial voice should not require changes in the scraper. If you find yourself making changes across multiple layers for a single improvement, you are likely solving the problem in the wrong layer.

#### Business Philosophy

Raivan Global's newsletter is a **top-of-funnel authority builder**, not a product in itself. Its success metric is not subscriber count — it is whether readers trust the brand enough to start a security audit. Every editorial decision should serve this goal: demonstrate expertise through analysis quality, not through claims.

#### Intelligence Philosophy

The newsletter is modelled on a **military intelligence briefing**, not a news digest. The conceptual model is:

1. **Collection** — Raw signal gathering (the scraper)
2. **Processing** — Filtering noise from signal (the quality gate)
3. **Analysis** — Finding patterns and assessing impact (the three-pass synthesis)
4. **Dissemination** — Formatting for decision-makers (the renderers)

This mirrors the intelligence cycle used by defence organisations. When you work on this system, think of yourself as improving an intelligence production pipeline, not building a blog engine.

#### Newsletter Philosophy

Each newsletter issue should answer three questions for the reader:

1. **What happened?** — Situation (facts only, grounded in scraped intelligence)
2. **Why should I care?** — Assessment (analytical judgment, impact on the reader's segment)
3. **What should I do?** — Recommendation (concrete countermeasure, grounded in CPP methodology)

If a newsletter issue does not answer all three, the synthesis pipeline needs improvement — not the renderer.

#### Key Data Models to Know

- `IntelScores` — 6-dimension article quality assessment (in `scraper/models.py`)
- `ThemeCluster` — Pass 1 output: grouped articles sharing a theme (in `newsletter/models.py`)
- `EnrichedTheme` — Pass 2 output: SITREP analysis with CPP grounding (in `newsletter/models.py`)
- `NewsletterContent` — Pass 3 output: complete newsletter in three tiers (in `newsletter/models.py`)

#### Key Files to Read First

If you're new to the codebase, read these files in this order:

1. `newsletter/constants.py` — All thresholds, weights, and brand tokens
2. `newsletter/models.py` — Every data model in the pipeline
3. `newsletter/prompts.py` — All three Gemini prompts + editorial voice
4. `newsletter/synthesis.py` — The orchestrator (10 lines that wire everything)
5. `routers/newsletter.py` — The API route that triggers everything
6. This document — the system guide you are reading now

---

## Appendix A: File Reference

### Python (ai-service/)

| File | Layer | Lines | Purpose |
|---|---|---|---|
| `newsletter/__init__.py` | — | ~1 | Package docstring |
| `newsletter/constants.py` | Config | ~190 | Scoring weights, thresholds, brand palette, segment labels, `SEGMENT_SHORT_LABELS`, job statuses, CPP domain labels, keyword maps |
| `newsletter/job_repository.py` | Data | ~90 | `newsletter_generation_jobs` CRUD (mirrors `report_repository.py`) |
| `newsletter/utils.py` | Utility | ~8 | `domain_label()` — translates CPP codes to plain-English labels (DRY helper) |
| `newsletter/prompts.py` | Config | ~125 | All 3 Gemini prompt templates + voice guidelines (Sprint 8: physical bias, incident citations, bullet exec summary) |
| `newsletter/models.py` | Models | ~50 | ThemeCluster, SegmentImpact, EnrichedTheme, NewsletterContent |
| `newsletter/clustering.py` | Pass 1 | ~90 | `cluster_articles()` — Gemini Flash theme grouping |
| `newsletter/enrichment.py` | Pass 2 | ~110 | `enrich_themes()` — Gemini Pro SITREP + CPP enrichment |
| `newsletter/composer.py` | Pass 3 | ~100 | `compose_newsletter()` — Gemini Pro editorial composition |
| `newsletter/synthesis.py` | Orchestrator | ~25 | `synthesize_newsletter_pipeline()` — wires 3 passes |
| `newsletter/render.py` | Renderer | ~200 | PNG one-pager: metadata bar, segment tags, bullet intro via `_render_intro()` |
| `newsletter/render_email.py` | Renderer | ~180 | Responsive email HTML |
| `newsletter/render_website.py` | Renderer | ~150 | Website article HTML |
| `newsletter/render_whatsapp.py` | Renderer | ~60 | WhatsApp plain text |
| `newsletter/trends.py` | Intelligence | ~80 | Trend detection (7/30/90-day windows) — exists, not yet wired |
| `newsletter/historical.py` | Intelligence | ~70 | Historical cross-referencing — exists, not yet wired |
| `scraper/gatekeeper.py` | Scoring | ~180 | 6-dimension article scoring via Gemini Flash |
| `scraper/pipeline.py` | Collection | ~270 | Scraper orchestration, persistence, `ON CONFLICT` updates |
| `scraper/sources.yaml` | Config | ~120 | All 31 data sources (7 NewsAPI + 19 RSS + 5 Playwright) |
| `scraper/models.py` | Models | ~60 | RawArticle, ProcessedArticle, IntelScores |
| `routers/newsletter.py` | Route | ~250 | `create_newsletter_draft()`, async `draft_newsletter()`, `get_generation_job()` |
| `tests/test_prompts.py` | Test | ~40 | Prompt contract tests (required instruction fragments) |
| `config.py` | Config | ~30 | Global AI service configuration |
| `cpp_repository.py` | Knowledge | ~80 | pgvector retrieval for CPP Seven Precis chunks |

### TypeScript (src/)

| File | Layer | Purpose |
|---|---|---|
| `config/newsletter-strings.ts` | Config | All newsletter UI strings, platform labels, status enums |
| `app/admin/newsletter/page.tsx` | View | Admin newsletter review page (thin orchestrator) |
| `app/admin/newsletter/_hooks/useNewsletterData.ts` | ViewModel | List, generate+poll job status, delete, copy WhatsApp, fetch email HTML |
| `app/admin/newsletter/_components/NewsletterCard.tsx` | View | Card with preview, actions, email dialog |
| `app/admin/newsletter/_components/PublishModal.tsx` | View | Platform publish modal with caption editor |
| `app/api/admin/newsletter/route.ts` | API | GET (list or `?action=status&jobId=`), POST (enqueue generate), DELETE (soft-delete) |
| `app/api/admin/newsletter/[id]/image/route.ts` | API | GET PNG bytes (admin-gated) |
| `app/api/admin/newsletter/[id]/publish/route.ts` | API | POST to social platforms (LinkedIn/X/FB/IG) |
| `app/api/admin/newsletter/[id]/formats/route.ts` | API | GET email HTML or WhatsApp JSON (admin-gated) |
| `app/intelligence/page.tsx` | Public | Server-rendered website_html for published newsletters |

### Database Tables

| Table | Key Columns | Role |
|---|---|---|
| `threat_intel` | title, url, summary, domain_tags, 6 score dims, affected_segments, embedding | Scraped + scored articles |
| `newsletters` | title, body_markdown, image_png, email_html, whatsapp_text, website_html, executive_summary, intelligence_briefing, full_analysis, commanders_note | Generated newsletter + all formats |
| `newsletter_generation_jobs` | id, days, status, newsletter_id, newsletter_title, error_message | Async admin "Generate Now" lifecycle (mirrors `report_jobs`) |
| `newsletter_posts` | newsletterId, platform, status, caption, externalId | Per-platform publish audit trail |

---

## Appendix B: Configuration Reference

### Environment Variables

| Variable | Used By | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | FastAPI | Gemini Flash + Pro API calls |
| `NEWS_API_KEY` | Scraper | NewsAPI data source queries |
| `DATABASE_URL` | Both | PostgreSQL connection string |
| `AI_SERVICE_KEY` | Both | Inter-service authentication (Next.js → FastAPI) |
| `LINKEDIN_ACCESS_TOKEN` | Next.js | LinkedIn company page posting |
| `LINKEDIN_ORG_ID` | Next.js | LinkedIn organization ID |

### Key Thresholds

| Threshold | Value | Location | Purpose |
|---|---|---|---|
| Quality gate | 0.6 | `newsletter/constants.py` | Minimum composite score for newsletter inclusion |
| Max themes | 5 | `newsletter/constants.py` | Maximum theme clusters per newsletter |
| Max articles | 15 | `newsletter/constants.py` | Maximum source articles per newsletter (`MAX_NEWSLETTER_ARTICLES`) |
| Job poll interval | 3 s | `useNewsletterData.ts` | Admin UI status poll frequency |
| Job poll timeout | 5 min | `useNewsletterData.ts` | Max wait before "still generating" notice |

---

## Appendix C: Sprint 8 Changelog (June 2026)

### Quality Tuning (commits `5ae0ed1`, `0f45d20`)

| Area | Change | Files |
|---|---|---|
| Pass 1 | Physical-security cluster bias (≥2 clusters CPP-01/03/06) | `prompts.py` → `CLUSTER_PROMPT` |
| Pass 2 | Incident citations required in `situation` field | `prompts.py` → `ENRICH_PROMPT` |
| Pass 3 | Bullet exec summary (3–4 lines, named incidents) | `prompts.py` → `COMPOSE_PROMPT`, `composer.py` → `fallback_compose()` |
| PNG | Metadata bar: issue date + "Analysis of N sources" | `render.py` |
| PNG | Segment tags (HNI, Enterprise, Critical Infra) on theme cards | `render.py`, `constants.py` → `SEGMENT_SHORT_LABELS` |
| PNG | Bullet intro rendering (`_render_intro()`) | `render.py` |
| Tests | Prompt contract tests | `tests/test_prompts.py` (5 tests) |
| Tests | PNG quality metadata integration test | `tests/test_newsletter.py` → `test_draft_route_gemini_path_png_has_quality_metadata` |
| Tests | Renderer unit tests for new PNG features | `tests/test_renderers.py` |

### Async Generation + Job Tracking (Sprint 8, uncommitted at doc write)

| Area | Change | Files |
|---|---|---|
| DB | `newsletter_generation_jobs` table | `prisma/migrations/13_newsletter_generation_jobs/` |
| FastAPI | Background draft with job lifecycle | `routers/newsletter.py`, `newsletter/job_repository.py` |
| FastAPI | `GET /newsletter/jobs/{id}` status endpoint | `routers/newsletter.py` |
| Next.js | Job status proxy + generate enqueue | `src/app/api/admin/newsletter/route.ts` |
| Admin UI | Poll every 3 s, max 5 min | `useNewsletterData.ts` |
| Strings | `GENERATE_PENDING`, `GENERATE_COMPLETE`, `GENERATE_STILL_RUNNING` | `newsletter-strings.ts` |
| Tests | Job status endpoint + draft returns `job_id` | `tests/test_newsletter.py`, `api-admin-newsletter.test.ts` |

### Infrastructure (Sprint 7 carry-over, documented in prior skill update)

| Area | Change |
|---|---|
| Scraper | Background task on `POST /scraper/run`; returns `status: started` |
| Scraper | `scraper_user` DB role isolation |
| Scraper | Naive UTC datetimes for `scraper_runs` columns |
| Gemini | Model upgraded to `gemini-2.5-flash` (2.0 deprecated) |

### Test Baseline

- **596+ tests** after Sprint 8 (593 post quality tuning + job tracking tests)
- Newsletter suite: 13 tests in `test_newsletter.py`
- Prompt contracts: 5 tests in `test_prompts.py`
| WhatsApp limit | 4000 chars | `render_whatsapp.py` | Output guard (WhatsApp API limit is 4096) |
| LinkedIn cron gap | 60 min | `main.py` | Gap between newsletter and LinkedIn cron to avoid race |
| Article limit (API) | 200 | `pipeline.py` | Hard cap on `get_stored_articles()` parameter |
