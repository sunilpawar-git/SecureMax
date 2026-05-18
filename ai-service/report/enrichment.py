"""
Enrichment functions for report findings.
- CPP citation: attach relevant CPP chunk excerpts via pgvector search.
- Threat intel: link matching threat intelligence articles by domain tags.
Reuses cpp_repository for embedding search — no duplicate pgvector logic.
"""

import asyncio
import json
import logging
from typing import Any

import asyncpg

from config import Settings
from cpp_repository import get_relevant_chunks
from gemini_client import GeminiClient

logger = logging.getLogger(__name__)

_EXCERPT_MAX_LEN = 300
_DEFAULT_MAX_ARTICLES = 5
_CPP_EMBED_CONCURRENCY = 3  # max parallel Gemini embedding calls


async def _enrich_single_finding_with_cpp(
    finding: dict,
    conn: asyncpg.Connection,
    settings: Settings,
    gemini: GeminiClient,
    sem: asyncio.Semaphore,
) -> dict:
    """Enrich one finding with a CPP citation. Semaphore-bounded."""
    copy = dict(finding)
    query = f"{finding.get('question', '')} {finding.get('answer', '')}"
    async with sem:
        try:
            chunks = await get_relevant_chunks(query, conn, settings, top_k=1, gemini=gemini)
            if chunks:
                chunk = chunks[0]
                copy["cpp_citation"] = {
                    "domain": chunk.domain,
                    "section": chunk.section,
                    "excerpt": chunk.chunk_text[:_EXCERPT_MAX_LEN],
                }
        except Exception:
            logger.warning(
                "CPP enrichment failed for domain %s",
                finding.get("domain"),
                exc_info=True,
            )
    return copy


async def enrich_findings_with_cpp(
    findings: list[dict],
    conn: asyncpg.Connection,
    settings: Settings,
    *,
    gemini: GeminiClient,
) -> list[dict]:
    """Return a new list of findings with cpp_citation attached where available.
    Parallel with bounded concurrency — does not mutate the original list."""
    if not findings:
        return []
    sem = asyncio.Semaphore(_CPP_EMBED_CONCURRENCY)
    tasks = [_enrich_single_finding_with_cpp(f, conn, settings, gemini, sem) for f in findings]
    return list(await asyncio.gather(*tasks))


async def enrich_findings_with_threat_intel(
    findings: list[dict],
    conn: asyncpg.Connection,
    max_articles: int = _DEFAULT_MAX_ARTICLES,
) -> list[dict[str, Any]]:
    """Query threat_intel table for articles matching finding domains.
    Returns deduplicated list of articles, capped at max_articles."""
    domains = sorted({f.get("domain", "") for f in findings if f.get("domain")})
    if not domains:
        return []

    rows = await conn.fetch(
        """
        SELECT id, title, url, summary, domain_tags, source, scraped_at
        FROM threat_intel
        WHERE soft_deleted = FALSE
        ORDER BY scraped_at DESC
        LIMIT $1
        """,
        max_articles * 3,
    )

    seen_urls: set[str] = set()
    articles: list[dict[str, Any]] = []

    for row in rows:
        if row["url"] in seen_urls:
            continue
        try:
            raw_tags = row["domain_tags"]
            tags = json.loads(raw_tags) if isinstance(raw_tags, str) else raw_tags
        except (json.JSONDecodeError, TypeError):
            tags = []

        if not any(d in tags for d in domains):
            continue

        seen_urls.add(row["url"])
        articles.append(
            {
                "id": row["id"],
                "title": row["title"],
                "url": row["url"],
                "summary": row["summary"],
                "domain_tags": tags,
                "source": row["source"],
            }
        )

        if len(articles) >= max_articles:
            break

    return articles
