"""
Scraper pipeline orchestrator.
Fetches from all tiers, deduplicates, processes, stores.
"""


from scraper.dedup import DedupStore
from scraper.models import ProcessedArticle, RawArticle, SourceHealth
from scraper.sources import RSS_FEEDS, fetch_news_api, fetch_rss_feed

_source_health: dict[str, SourceHealth] = {}
_dedup = DedupStore()
_articles_store: list[ProcessedArticle] = []


def get_source_health() -> dict[str, SourceHealth]:
    return _source_health


def get_stored_articles() -> list[ProcessedArticle]:
    return _articles_store


async def run_pipeline() -> dict:
    """Execute full ingestion pipeline. Returns summary stats."""
    stats = {"fetched": 0, "duplicates": 0, "stored": 0, "errors": []}

    raw_articles: list[RawArticle] = []
    raw_articles.extend(await _fetch_tier("news_api", stats))
    raw_articles.extend(await _fetch_rss_tier(stats))

    for article in raw_articles:
        stats["fetched"] += 1
        if _dedup.is_duplicate(article.url_hash, article.content_hash):
            stats["duplicates"] += 1
            continue
        _dedup.mark_seen(article.url_hash, article.content_hash)
        processed = _process_article(article)
        _articles_store.append(processed)
        stats["stored"] += 1

    return stats


async def _fetch_tier(tier_name: str, stats: dict) -> list[RawArticle]:
    health = _source_health.setdefault(
        tier_name,
        SourceHealth(source_name=tier_name, source_tier="news_api"),
    )
    try:
        articles = await fetch_news_api()
        health.record_success(len(articles))
        return articles
    except Exception as e:
        health.record_failure()
        stats["errors"].append(f"{tier_name}: {e}")
        return []


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


def _process_article(article: RawArticle) -> ProcessedArticle:
    """Placeholder processing. In production: Gemini Flash summarize + tag."""
    tags = _extract_basic_tags(article.content)
    return ProcessedArticle(
        url=article.url,
        url_hash=article.url_hash,
        content_hash=article.content_hash,
        title=article.title,
        summary=article.content[:200],
        tags=tags,
        relevance_score=len(tags) * 0.15,
        source_name=article.source_name,
        source_tier=article.source_tier,
        published_at=article.published_at,
    )


def _extract_basic_tags(content: str) -> list[str]:
    """Simple keyword-based tagging. Gemini Flash replaces this in production."""
    content_lower = content.lower()
    from scraper.sources import SECURITY_KEYWORDS
    return [kw for kw in SECURITY_KEYWORDS if kw in content_lower]


def reset_pipeline() -> None:
    _source_health.clear()
    _dedup.reset()
    _articles_store.clear()
