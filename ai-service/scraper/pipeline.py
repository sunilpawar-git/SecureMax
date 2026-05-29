"""
Scraper pipeline orchestrator.
Fetches from all tiers, deduplicates, tags via Gemini, persists to threat_intel.
"""

import asyncio
import json
import logging
from collections.abc import Awaitable, Callable

import asyncpg

from scraper.dedup import is_duplicate
from scraper.models import ProcessedArticle, RawArticle, SourceHealth
from scraper.source_loader import load_sources
from scraper.sources import (
    RSS_FEEDS,
    SECURITY_KEYWORDS,
    fetch_news_api,
    fetch_playwright_tier,
    fetch_rss_feed,
)

logger = logging.getLogger(__name__)

_source_health: dict[str, SourceHealth] = {}
_pipeline_lock = asyncio.Lock()


def get_source_health() -> dict[str, SourceHealth]:
    return _source_health


async def get_stored_articles(pool: asyncpg.Pool, limit: int = 50) -> list[dict]:
    """Fetch recent articles from the database (not memory)."""
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
) -> dict:
    """Execute full ingestion pipeline. Returns summary stats.

    Args:
        pool: asyncpg connection pool for DB persistence and dedup.
        process_fn: async callable(RawArticle) -> ProcessedArticle.
                    If None, uses keyword-based fallback.
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
        stats: dict = {
            "fetched": 0,
            "duplicates": 0,
            "stored": 0,
            "gemini_tagged": 0,
            "errors": [],
        }

        raw_articles: list[RawArticle] = []
        raw_articles.extend(await _fetch_news_api_tier(stats))
        raw_articles.extend(await _fetch_rss_tier(stats))
        raw_articles.extend(await _fetch_playwright_tier(stats))

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

                inserted = await _persist_article(processed, pool)
                if inserted:
                    stats["stored"] += 1
                else:
                    stats["duplicates"] += 1
            except Exception as e:
                logger.warning("Failed to process article %s: %s", article.url, e)
                stats["errors"].append(f"process: {article.url}: {e}")

        if stats["fetched"] == 0:
            logger.warning("Pipeline fetched 0 articles across all tiers")

        return stats


async def _persist_article(article: ProcessedArticle, pool: asyncpg.Pool) -> bool:
    """INSERT into threat_intel. Returns True if inserted, False if duplicate."""
    async with pool.acquire() as conn:
        result = await conn.execute(
            """
            INSERT INTO threat_intel
                (id, title, url, content_hash, summary, domain_tags, industry_tags,
                 source, relevance_score)
            VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)
            ON CONFLICT (url) DO NOTHING
            """,
            article.title,
            article.url,
            article.content_hash,
            article.summary,
            json.dumps(article.domain_tags),
            json.dumps(article.industry_tags),
            article.source,
            article.relevance_score,
        )
        return result == "INSERT 0 1"


def _fallback_process(article: RawArticle) -> ProcessedArticle:
    """Keyword-based tagging when Gemini is unavailable."""
    content_lower = article.content.lower()
    matched_kw = [kw for kw in SECURITY_KEYWORDS if kw in content_lower]

    domain_map = {
        "physical security": "CPP-01",
        "cctv": "CPP-01",
        "access control": "CPP-01",
        "perimeter breach": "CPP-01",
        "surveillance": "CPP-01",
        "fire safety": "CPP-03",
        "emergency response": "CPP-03",
        "theft prevention": "CPP-06",
        "guard patrol": "CPP-06",
        "intrusion detection": "CPP-05",
        "security audit": "CPP-07",
    }
    domain_tags = sorted({domain_map[kw] for kw in matched_kw if kw in domain_map})
    if not domain_tags:
        domain_tags = ["CPP-07"]

    return ProcessedArticle(
        title=article.title,
        url=article.url,
        content_hash=article.content_hash,
        summary=article.content[:300],
        domain_tags=domain_tags,
        industry_tags=["general"],
        source=f"{article.source_name} ({article.source_tier})",
        relevance_score=len(matched_kw) * 0.15,
    )


async def _fetch_news_api_tier(stats: dict) -> list[RawArticle]:
    """Iterates all newsapi entries from sources.yaml, deduplicating by URL."""
    try:
        sources = load_sources()
    except Exception as e:
        logger.warning("Failed to load sources.yaml: %s", e)
        stats["errors"].append(f"sources.yaml: {e}")
        return []

    all_articles: list[RawArticle] = []
    seen_urls: set[str] = set()

    for entry in sources.get("newsapi", []):
        entry_name = entry.get("name", "newsapi")
        health_key = f"news_api:{entry_name}"
        health = _source_health.setdefault(
            health_key,
            SourceHealth(source_name=health_key, source_tier="news_api"),
        )
        try:
            articles = await fetch_news_api(
                query=entry.get("query", "physical security"),
                page_size=entry.get("page_size", 20),
            )
            health.record_success(len(articles))
            for a in articles:
                if a.url not in seen_urls:
                    seen_urls.add(a.url)
                    all_articles.append(a)
            if not articles:
                logger.info("News API '%s' returned 0 articles", entry_name)
        except Exception as e:
            health.record_failure()
            stats["errors"].append(f"{health_key}: {e}")

    return all_articles


async def _fetch_rss_tier(stats: dict) -> list[RawArticle]:
    all_articles: list[RawArticle] = []
    for feed in RSS_FEEDS:
        source_name = feed["name"]
        health = _source_health.setdefault(
            source_name,
            SourceHealth(source_name=source_name, source_tier="rss"),
        )
        try:
            articles = await fetch_rss_feed(feed["url"], source_name)
            health.record_success(len(articles))
            all_articles.extend(articles)
        except Exception as e:
            health.record_failure()
            stats["errors"].append(f"{source_name}: {e}")
    return all_articles


async def _fetch_playwright_tier(stats: dict) -> list[RawArticle]:
    tier_name = "playwright"
    health = _source_health.setdefault(
        tier_name,
        SourceHealth(source_name=tier_name, source_tier="playwright"),
    )
    try:
        articles = await fetch_playwright_tier()
        health.record_success(len(articles))
        if not articles:
            logger.info("Playwright tier returned 0 articles")
        return articles
    except Exception as e:
        health.record_failure()
        stats["errors"].append(f"{tier_name}: {e}")
        return []


def reset_pipeline() -> None:
    """Reset module state — for test isolation only."""
    global _pipeline_lock  # noqa: PLW0603
    _source_health.clear()
    _pipeline_lock = asyncio.Lock()
