"""
Scraper pipeline orchestrator.
Fetches from all tiers, deduplicates, tags via Gemini, persists to threat_intel.
"""

import asyncio
import json
import logging
import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime

import asyncpg

from newsletter.constants import DOMAIN_KEYWORD_MAP
from scraper.dedup import is_duplicate
from scraper.embedder import embed_and_store
from scraper.fetchers import fetch_news_api_tier, fetch_playwright_tier_wrapper, fetch_rss_tier
from scraper.gatekeeper import compute_composite_score, fallback_scores
from scraper.models import ProcessedArticle, RawArticle, SourceHealth
from scraper.sources import SECURITY_KEYWORDS

logger = logging.getLogger(__name__)

_source_health: dict[str, SourceHealth] = {}
_pipeline_lock = asyncio.Lock()


def get_source_health() -> dict[str, SourceHealth]:
    return _source_health


async def get_stored_articles(pool: asyncpg.Pool, limit: int = 50) -> list[dict]:
    """Fetch recent articles from the database (not memory)."""
    limit = min(limit, 200)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, title, url, summary, domain_tags, industry_tags, source, scraped_at
            FROM threat_intel
            WHERE soft_deleted = FALSE
            ORDER BY scraped_at DESC
            LIMIT $1
            """,
            limit,
        )
    articles = []
    for r in rows:
        dt = r["domain_tags"]
        it = r["industry_tags"]
        articles.append(
            {
                "id": str(r["id"]),
                "title": r["title"],
                "url": r["url"],
                "summary": r["summary"],
                "domain_tags": json.loads(dt) if isinstance(dt, str) else dt,
                "industry_tags": json.loads(it) if isinstance(it, str) else it,
                "source": r["source"],
                "scraped_at": r["scraped_at"].isoformat() if r["scraped_at"] else None,
            }
        )
    return articles


async def run_pipeline(
    pool: asyncpg.Pool,
    process_fn: Callable[[RawArticle], Awaitable[ProcessedArticle]] | None = None,
    embed_fn: Callable[[str], Awaitable[list[float]]] | None = None,
) -> dict:
    """Execute full ingestion pipeline. Returns summary stats.

    Args:
        pool: asyncpg connection pool for DB persistence and dedup.
        process_fn: async callable(RawArticle) -> ProcessedArticle.
                    If None, uses keyword-based fallback.
        embed_fn: async callable(str) -> list[float]. If provided, embeds
                  article summaries on ingest.
    """
    if _pipeline_lock.locked():
        return {
            "error": "Pipeline already running",
            "fetched": 0,
            "stored": 0,
            "duplicates": 0,
            "gemini_tagged": 0,
            "errors": [],
        }

    async with _pipeline_lock:
        run_id = str(uuid.uuid4())
        await _insert_run(pool, run_id)

        stats: dict = {
            "fetched": 0,
            "duplicates": 0,
            "stored": 0,
            "gemini_tagged": 0,
            "errors": [],
        }

        raw_articles: list[RawArticle] = []
        raw_articles.extend(await fetch_news_api_tier(stats, _source_health))
        raw_articles.extend(await fetch_rss_tier(stats, _source_health))
        raw_articles.extend(await fetch_playwright_tier_wrapper(stats, _source_health))

        for article in raw_articles:
            stats["fetched"] += 1
            try:
                if await is_duplicate(article.url, article.content_hash, pool):
                    stats["duplicates"] += 1
                    continue

                if process_fn:
                    processed = await process_fn(article)
                    if processed.tagged_by_gemini:
                        stats["gemini_tagged"] += 1
                else:
                    processed = _fallback_process(article)

                inserted = await _persist_article(processed, pool, embed_fn)
                if inserted:
                    stats["stored"] += 1
                else:
                    stats["duplicates"] += 1
            except Exception as e:
                logger.warning("Failed to process article %s: %s", article.url, e)
                stats["errors"].append(f"process: {article.url}: {e}")

        if stats["fetched"] == 0:
            logger.warning("Pipeline fetched 0 articles across all tiers")

        await _complete_run(pool, run_id, stats)
        return stats


async def _insert_run(pool: asyncpg.Pool, run_id: str) -> None:
    """INSERT a new scraper_runs row with status=running."""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO scraper_runs (id, status, started_at)
                VALUES ($1, 'running', $2)
                """,
                run_id,
                datetime.now(UTC).replace(tzinfo=None),
            )
    except Exception as e:
        logger.warning("Failed to insert scraper run %s: %s", run_id, e)


async def _complete_run(pool: asyncpg.Pool, run_id: str, stats: dict) -> None:
    """UPDATE scraper_runs with final stats and completed timestamp."""
    status = "completed"
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE scraper_runs
                SET status = $2,
                    articles_found = $3,
                    articles_stored = $4,
                    duplicates = $5,
                    errors = $6::jsonb,
                    completed_at = $7
                WHERE id = $1
                """,
                run_id,
                status,
                stats["fetched"],
                stats["stored"],
                stats["duplicates"],
                json.dumps(stats["errors"]) if stats["errors"] else None,
                datetime.now(UTC).replace(tzinfo=None),
            )
    except Exception as e:
        logger.warning("Failed to complete scraper run %s: %s", run_id, e)


async def _persist_article(
    article: ProcessedArticle,
    pool: asyncpg.Pool,
    embed_fn: Callable[[str], Awaitable[list[float]]] | None = None,
) -> bool:
    """INSERT into threat_intel. Returns True if inserted, False if duplicate."""
    scores = article.intel_scores
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO threat_intel
                (id, title, url, content_hash, summary, domain_tags, industry_tags,
                 source, relevance_score,
                 physical_security_relevance, geographic_relevance,
                 threat_actionability, educational_value,
                 recency_novelty, audience_impact, affected_segments)
            VALUES (gen_random_uuid()::text,
                    $1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8,
                    $9, $10, $11, $12, $13, $14, $15::jsonb)
            ON CONFLICT (url) DO UPDATE SET
                content_hash = EXCLUDED.content_hash,
                summary = EXCLUDED.summary,
                relevance_score = EXCLUDED.relevance_score,
                physical_security_relevance = EXCLUDED.physical_security_relevance,
                geographic_relevance = EXCLUDED.geographic_relevance,
                threat_actionability = EXCLUDED.threat_actionability,
                educational_value = EXCLUDED.educational_value,
                recency_novelty = EXCLUDED.recency_novelty,
                audience_impact = EXCLUDED.audience_impact,
                affected_segments = EXCLUDED.affected_segments
            RETURNING id
            """,
            article.title,
            article.url,
            article.content_hash,
            article.summary,
            json.dumps(article.domain_tags),
            json.dumps(article.industry_tags),
            article.source,
            article.relevance_score,
            scores.physical_security_relevance if scores else 0.0,
            scores.geographic_relevance if scores else 0.0,
            scores.threat_actionability if scores else 0.0,
            scores.educational_value if scores else 0.0,
            scores.recency_novelty if scores else 0.0,
            scores.audience_impact if scores else 0.0,
            json.dumps(scores.affected_segments if scores else []),
        )
        if row is None:
            return False

        if embed_fn and article.summary:
            await embed_and_store(conn, row["id"], article.summary, embed_fn)

        return True


def _fallback_process(article: RawArticle) -> ProcessedArticle:
    """Keyword-based tagging when Gemini is unavailable."""
    content_lower = article.content.lower()
    matched_kw = [kw for kw in SECURITY_KEYWORDS if kw in content_lower]

    domain_tags = sorted(
        {DOMAIN_KEYWORD_MAP[kw] for kw in matched_kw if kw in DOMAIN_KEYWORD_MAP}
    )
    if not domain_tags:
        domain_tags = ["CPP-07"]

    intel_scores = fallback_scores(article)
    return ProcessedArticle(
        title=article.title,
        url=article.url,
        content_hash=article.content_hash,
        summary=article.content[:300],
        domain_tags=domain_tags,
        industry_tags=["general"],
        source=f"{article.source_name} ({article.source_tier})",
        relevance_score=compute_composite_score(intel_scores),
        intel_scores=intel_scores,
    )


def reset_pipeline() -> None:
    """Reset module state — for test isolation only."""
    global _pipeline_lock  # noqa: PLW0603
    _source_health.clear()
    _pipeline_lock = asyncio.Lock()
