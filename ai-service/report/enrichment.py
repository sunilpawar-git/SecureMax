"""
Enrichment functions for report findings.
- CPP citation: attach relevant CPP chunk excerpts via pgvector search.
- Threat intel: link matching threat intelligence articles by domain tags.
Reuses cpp_repository for embedding search — no duplicate pgvector logic.
"""

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


async def enrich_findings_with_cpp(
    findings: list[dict],
    conn: asyncpg.Connection,
    settings: Settings,
    *,
    gemini: GeminiClient,
) -> list[dict]:
    """Return a new list of findings with cpp_citation attached where available.
    Sequential to respect asyncpg single-connection constraint."""
    if not findings:
        return []
    results = []
    for finding in findings:
        enriched = dict(finding)
        query = f"{finding.get('question', '')} {finding.get('answer', '')}"
        try:
            chunks = await get_relevant_chunks(
                query, conn, settings, top_k=1, gemini=gemini
            )
            if chunks:
                chunk = chunks[0]
                enriched["cpp_citation"] = {
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
        results.append(enriched)
    return results


async def enrich_findings_with_threat_intel(
    findings: list[dict],
    conn: asyncpg.Connection,
    max_articles: int = _DEFAULT_MAX_ARTICLES,
) -> list[dict[str, Any]]:
    """Query threat_intel for articles matching finding domains.
    Uses PostgreSQL ?| operator for server-side JSONB array containment.
    Returns deduplicated articles capped at max_articles, newest first."""
    domains = sorted({f.get("domain", "") for f in findings if f.get("domain")})
    if not domains:
        return []

    rows = await conn.fetch(
        """
        SELECT id, title, url, summary, domain_tags, source, scraped_at
        FROM threat_intel
        WHERE soft_deleted = FALSE
          AND domain_tags ?| $1
        ORDER BY scraped_at DESC
        LIMIT $2
        """,
        domains,
        max_articles,
    )

    articles: list[dict[str, Any]] = []
    for row in rows:
        try:
            raw_tags = row["domain_tags"]
            tags = json.loads(raw_tags) if isinstance(raw_tags, str) else raw_tags
        except (json.JSONDecodeError, TypeError):
            tags = []

        scraped_at = row.get("scraped_at")
        articles.append(
            {
                "id": row["id"],
                "title": row["title"],
                "url": row["url"],
                "summary": row["summary"],
                "domain_tags": tags,
                "source": row["source"],
                "scraped_at": scraped_at.isoformat() if scraped_at else None,
            }
        )

    return articles
