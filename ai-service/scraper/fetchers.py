"""
Scraper tier fetchers — extracted from pipeline.py to keep files under 300 lines.
Each function fetches from a specific data tier and returns raw articles.
"""

import asyncio
import logging

from scraper.models import RawArticle, SourceHealth
from scraper.source_loader import load_sources
from scraper.sources import (
    RSS_FEEDS,
    fetch_news_api,
    fetch_playwright_tier,
    fetch_rss_feed,
)

logger = logging.getLogger(__name__)


async def fetch_news_api_tier(
    stats: dict,
    source_health: dict[str, SourceHealth],
) -> list[RawArticle]:
    """Iterates all newsapi entries from sources.yaml, deduplicating by URL."""
    try:
        sources = load_sources()
    except (OSError, ValueError) as e:
        logger.warning("Failed to load sources.yaml: %s", e)
        stats["errors"].append(f"sources.yaml: {e}")
        return []

    all_articles: list[RawArticle] = []
    seen_urls: set[str] = set()

    for entry in sources.get("newsapi", []):
        entry_name = entry.get("name", "newsapi")
        health_key = f"news_api:{entry_name}"
        health = source_health.setdefault(
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


async def fetch_rss_tier(
    stats: dict,
    source_health: dict[str, SourceHealth],
) -> list[RawArticle]:
    """Fetch all configured RSS feeds concurrently.

    Uses asyncio.gather so all feeds are fetched in parallel rather than
    sequentially — reduces wall-clock time from O(N×latency) to O(max_latency),
    keeping the full pipeline well within the 300s HTTP timeout.
    """

    async def _fetch_one(feed: dict) -> list[RawArticle]:
        source_name = feed["name"]
        health = source_health.setdefault(
            source_name,
            SourceHealth(source_name=source_name, source_tier="rss"),
        )
        try:
            articles = await fetch_rss_feed(feed["url"], source_name)
            health.record_success(len(articles))
            return articles
        except Exception as e:
            health.record_failure()
            stats["errors"].append(f"{source_name}: {e}")
            return []

    results = await asyncio.gather(*[_fetch_one(feed) for feed in RSS_FEEDS])
    all_articles: list[RawArticle] = []
    for batch in results:
        all_articles.extend(batch)
    return all_articles


async def fetch_playwright_tier_wrapper(
    stats: dict,
    source_health: dict[str, SourceHealth],
) -> list[RawArticle]:
    """Fetch from Playwright-powered scraper targets."""
    tier_name = "playwright"
    health = source_health.setdefault(
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
