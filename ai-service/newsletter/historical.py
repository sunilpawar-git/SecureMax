"""
Historical cross-referencing — find similar past incidents for enrichment.
Queries the threat_intel archive for articles with matching domain tags
to surface patterns and precedent.
"""

import json
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class HistoricalMatch:
    id: str
    title: str
    summary: str
    domain_tags: list[str]
    scraped_at: str
    similarity_reason: str


async def find_related_incidents(
    conn,
    *,
    domain_tags: list[str],
    exclude_ids: list[str] | None = None,
    lookback_days: int = 90,
    limit: int = 5,
) -> list[HistoricalMatch]:
    """Find historical articles with overlapping domain tags."""
    if not domain_tags:
        return []

    exclude = exclude_ids or []

    rows = await conn.fetch(
        """
        SELECT id, title, summary, domain_tags, scraped_at
        FROM threat_intel
        WHERE soft_deleted = FALSE
          AND scraped_at >= NOW() - make_interval(days => $1)
          AND scraped_at < NOW() - INTERVAL '7 days'
          AND domain_tags ?| $2
          AND id != ALL($3)
        ORDER BY relevance_score DESC, scraped_at DESC
        LIMIT $4
        """,
        lookback_days,
        domain_tags,
        exclude,
        limit,
    )

    matches = []
    for row in rows:
        tags = row["domain_tags"]
        if isinstance(tags, str):
            tags = json.loads(tags)

        overlap = set(tags) & set(domain_tags)
        matches.append(
            HistoricalMatch(
                id=row["id"],
                title=row["title"],
                summary=row["summary"][:200],
                domain_tags=tags,
                scraped_at=row["scraped_at"].isoformat() if row["scraped_at"] else "",
                similarity_reason=f"Shared domains: {', '.join(sorted(overlap))}",
            )
        )

    return matches


def format_historical_context(matches: list[HistoricalMatch]) -> str:
    """Format matches for injection into enrichment prompts."""
    if not matches:
        return "No similar historical incidents found in the archive."

    lines = [f"Historical precedent ({len(matches)} related incident(s)):"]
    for m in matches:
        lines.append(f"- [{m.scraped_at[:10]}] {m.title}: {m.summary} ({m.similarity_reason})")
    return "\n".join(lines)
