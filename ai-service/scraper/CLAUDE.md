# CLAUDE.md — `ai-service/scraper/`

Threat intel ingestion pipeline: 3-tier source fetcher, dedup, Gemini tagging, DB persistence.

## Rules

- **3 tiers**: NewsAPI → RSS (feedparser) → Playwright headless; each in `sources.py`
- **`sources.yaml` is SSOT** for all source URLs — never hardcode URLs in Python
- **Run `source_loader.py` validation** before adding a new source; required fields differ per tier type
- **Dedup checks both `url` and `content_hash`** — both must be unique to persist
- **Use `InMemoryDedupStore` in tests** — never hit DB in unit tests
- **Scraper must never scrape behind authentication** (Rule 14) — check `sources.yaml` for `requires_auth`
- **Gemini tagger classifies domain tags**; `_fallback_process()` handles Gemini unavailability — never skip tagging entirely

## Tagging Flow

1. Fetch all tiers concurrently
2. Dedup by `url` or `content_hash`
3. For each unique article:
   - Call `process_fn(article)` — Gemini-assisted domain tagging
   - If Gemini fails, call `_fallback_process()` — keyword-based tagging
4. Insert into `threat_intel` table

## Common Pitfalls

1. Hardcoding source URLs in Python → not in `sources.yaml`, hard to update
2. Skipping `source_loader.py` validation → invalid schema reaches scraper
3. Scraping behind authentication → violates Rule 14, fails in prod
4. Using `InMemoryDedupStore` with real DB in tests → false positives
5. Letting Gemini failures skip tagging entirely → articles end up untagged
6. Duplicating dedup logic → inconsistent uniqueness checks
7. Missing health checks on sources → no visibility into scraper failures
