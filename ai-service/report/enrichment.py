"""
Enrichment functions for report findings.
- CPP citation: attach relevant CPP chunk excerpts via pgvector search.
- Threat intel: semantic pgvector search with JSONB tag fallback.
Reuses cpp_repository for embedding search — no duplicate pgvector logic.
"""

import json
import logging
from typing import Any

import asyncpg

from config import Settings
from cpp_repository import get_relevant_chunks
from gemini_client import GeminiClient, GeminiError

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
        finding_domain = finding.get("domain")
        finding_domains = [finding_domain] if finding_domain else None
        try:
            chunks = await get_relevant_chunks(
                query, conn, settings, top_k=1, gemini=gemini, domains=finding_domains
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
    *,
    city: str | None = None,
    country: str | None = None,
    gemini: GeminiClient | None = None,
    settings: Settings | None = None,
) -> list[dict[str, Any]]:
    """Semantic pgvector search against threat_intel embeddings.
    Falls back to JSONB domain_tags ?| if embeddings unavailable."""
    domains = sorted({f.get("domain", "") for f in findings if f.get("domain")})
    if not domains:
        return []

    rows = await _threat_intel_semantic(
        findings, conn, max_articles, gemini=gemini, settings=settings
    )
    if rows is None:
        rows = await _threat_intel_tag_fallback(domains, conn, max_articles, city, country)

    return _rows_to_articles(rows)


async def _threat_intel_semantic(
    findings: list[dict],
    conn: asyncpg.Connection,
    max_articles: int,
    *,
    gemini: GeminiClient | None,
    settings: Settings | None,
) -> list | None:
    """Pgvector cosine search using finding text as query. Returns None to signal fallback."""
    if not gemini or not settings:
        return None
    query_parts = [
        f"{f.get('question', '')} {f.get('answer', '')}" for f in findings[:5]
    ]
    query_text = " ".join(query_parts)[:500]
    try:
        embedding = await gemini.embed(query_text, model=settings.embedding_model)
    except (GeminiError, ValueError):
        logger.warning("Threat intel embedding failed — falling back to tag search")
        return None

    embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"
    rows = await conn.fetch(
        """
        SELECT id, title, url, summary, domain_tags, source, scraped_at
        FROM threat_intel
        WHERE soft_deleted = FALSE AND embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2
        """,
        embedding_str,
        max_articles,
    )
    return list(rows) if rows else None


async def _threat_intel_tag_fallback(
    domains: list[str],
    conn: asyncpg.Connection,
    max_articles: int,
    city: str | None,
    country: str | None,
) -> list:
    """JSONB tag-based fallback with optional location boost."""
    location_clause = ""
    params: list[Any] = [domains, max_articles]
    if city or country:
        location_terms = [t for t in (city, country) if t]
        location_clause = (
            ", CASE WHEN " + " OR ".join(
                f"(summary ILIKE '%' || ${i+3} || '%' OR title ILIKE '%' || ${i+3} || '%')"
                for i, _ in enumerate(location_terms)
            ) + " THEN 0 ELSE 1 END AS location_rank"
        )
        params.extend(location_terms)

    order_clause = "location_rank, scraped_at DESC" if location_clause else "scraped_at DESC"

    query = (
        f"SELECT id, title, url, summary, domain_tags, source, scraped_at"
        f" {location_clause}"
        f" FROM threat_intel"
        f" WHERE soft_deleted = FALSE AND domain_tags ?| $1"
        f" ORDER BY {order_clause}"
        f" LIMIT $2"
    )
    return list(await conn.fetch(query, *params))


def _rows_to_articles(rows: list) -> list[dict[str, Any]]:
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
