"""
Tiered source fetchers: News API (tier 1), RSS (tier 2), Playwright (tier 3).
Each fetcher returns a list of RawArticle instances.
"""

import logging
from datetime import datetime
from xml.etree.ElementTree import Element

import httpx
from defusedxml.ElementTree import fromstring as safe_fromstring

from config import get_settings
from scraper.models import RawArticle

logger = logging.getLogger(__name__)

SECURITY_KEYWORDS = [
    "physical security",
    "cctv",
    "access control",
    "perimeter breach",
    "security audit",
    "theft prevention",
    "intrusion detection",
    "surveillance",
    "guard patrol",
    "fire safety",
    "emergency response",
    "security breach",
    "security incident",
    "security threat",
    "security risk",
    "security management",
    "security officer",
    "trespassing",
    "break-in",
    "burglary",
    "workplace violence",
    "insider threat",
    "crisis management",
]


async def fetch_news_api(query: str = "physical security") -> list[RawArticle]:
    """Tier 1: News API — most reliable source."""
    settings = get_settings()
    if not settings.news_api_key:
        return []

    url = "https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 20,
        "apiKey": settings.news_api_key,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params)
        if resp.status_code != 200:
            raise ConnectionError(f"News API returned {resp.status_code}")

        data = resp.json()
        articles: list[RawArticle] = []
        for item in data.get("articles", []):
            content = item.get("content") or item.get("description") or ""
            if not content:
                continue
            articles.append(
                RawArticle(
                    url=item["url"],
                    title=item.get("title", ""),
                    content=content,
                    source_name=item.get("source", {}).get("name", "Unknown"),
                    source_tier="news_api",
                    published_at=_parse_datetime(item.get("publishedAt")),
                )
            )
        return articles


async def fetch_rss_feed(feed_url: str, source_name: str) -> list[RawArticle]:
    """Tier 2: RSS feeds — stable, niche sources."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(feed_url)
        if resp.status_code != 200:
            raise ConnectionError(f"RSS feed returned {resp.status_code}")

    root = safe_fromstring(resp.text)
    articles: list[RawArticle] = []

    for item in root.iter("item"):
        title = _get_text(item, "title")
        link = _get_text(item, "link")
        description = _get_text(item, "description")
        pub_date = _get_text(item, "pubDate")

        if not link or not description:
            continue

        combined = f"{title} {description}".lower()
        if not any(kw in combined for kw in SECURITY_KEYWORDS):
            continue

        articles.append(
            RawArticle(
                url=link,
                title=title,
                content=description,
                source_name=source_name,
                source_tier="rss",
                published_at=_parse_rss_date(pub_date),
            )
        )

    return articles


def _get_text(element: Element, tag: str) -> str:
    child = element.find(tag)
    return child.text.strip() if child is not None and child.text else ""


def _parse_datetime(dt_str: str | None) -> datetime | None:
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def _parse_rss_date(dt_str: str) -> datetime | None:
    if not dt_str:
        return None
    try:
        from email.utils import parsedate_to_datetime

        return parsedate_to_datetime(dt_str)
    except (ValueError, TypeError):
        return None


from scraper.source_loader import get_playwright_targets, get_rss_feeds

RSS_FEEDS = get_rss_feeds()

PLAYWRIGHT_TARGETS = get_playwright_targets()


async def fetch_playwright_tier() -> list[RawArticle]:
    """Tier 3: Playwright — fragile, last resort for sites without RSS/API."""
    articles: list[RawArticle] = []
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.warning("Playwright not installed — skipping tier 3")
        return []

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            for target in PLAYWRIGHT_TARGETS:
                page = await browser.new_page()
                try:
                    await page.goto(
                        target["url"],
                        timeout=15000,
                        wait_until="domcontentloaded",
                    )
                    containers = await page.query_selector_all(
                        target["selector_article"]
                    )
                    for el in containers[: target["max_articles"]]:
                        try:
                            title_el = await el.query_selector(
                                target["selector_title"]
                            )
                            link_el = await el.query_selector(
                                target["selector_link"]
                            )
                            if not title_el or not link_el:
                                continue
                            title = (
                                await title_el.text_content() or ""
                            ).strip()
                            href = await link_el.get_attribute("href") or ""
                            if not href:
                                continue
                            if not href.startswith("http"):
                                base = target["url"].rstrip("/")
                                href = f"{base}/{href.lstrip('/')}"
                            content = (
                                await el.text_content() or ""
                            ).strip()
                            if title:
                                articles.append(
                                    RawArticle(
                                        url=href,
                                        title=title,
                                        content=content[:500],
                                        source_name=target["name"],
                                        source_tier="playwright",
                                    )
                                )
                        except Exception as e:
                            logger.debug(
                                "Skipping element in %s: %s",
                                target["name"],
                                e,
                            )
                except Exception as e:
                    logger.warning(
                        "Playwright failed for %s: %s", target["name"], e
                    )
                finally:
                    await page.close()
            await browser.close()
    except Exception as e:
        logger.error("Playwright browser launch failed: %s", e)

    return articles
