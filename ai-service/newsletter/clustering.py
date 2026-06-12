"""
Pass 1 — Cluster & Theme: group articles by security pattern.
Gemini-powered clustering with deterministic fallback.
"""

import json
import logging
import re

from newsletter.constants import MAX_NEWSLETTER_THEMES
from newsletter.models import ThemeCluster
from newsletter.prompts import CLUSTER_PROMPT
from newsletter.utils import domain_label

logger = logging.getLogger(__name__)

_FENCE_RE = re.compile(r"^```[a-z]*\n?|\n?```$")


async def cluster_articles(
    articles: list[dict],
    *,
    gemini,
) -> list[ThemeCluster]:
    """Group articles into 3-5 themed clusters via Gemini (or fallback)."""
    article_text = "\n".join(
        f"ID: {a['id']} | Title: {a['title']} | "
        f"Summary: {a['summary'][:200]} | "
        f"Domains: {','.join(a.get('domain_tags', []))}"
        for a in articles
    )

    prompt = CLUSTER_PROMPT.substitute(articles=article_text)

    try:
        raw = await gemini.generate(prompt)
        cleaned = _FENCE_RE.sub("", raw.strip()).strip()
        parsed = json.loads(cleaned)

        if not isinstance(parsed, list) or not parsed:
            raise ValueError("Expected non-empty JSON array")

        clusters = [ThemeCluster(**c) for c in parsed[:MAX_NEWSLETTER_THEMES]]
        _validate_coverage(clusters, articles)
        return clusters
    except Exception as e:
        logger.warning("Gemini clustering failed: %s — using fallback", e)
        return fallback_cluster(articles)


def fallback_cluster(articles: list[dict]) -> list[ThemeCluster]:
    """Deterministic domain-based clustering when Gemini is unavailable."""
    domain_groups: dict[str, list[str]] = {}
    domain_titles: dict[str, list[str]] = {}

    for a in articles:
        tags = a.get("domain_tags", ["CPP-07"])
        primary = tags[0] if tags else "CPP-07"
        domain_groups.setdefault(primary, []).append(a["id"])
        domain_titles.setdefault(primary, []).append(a["title"])

    clusters = []
    for domain, ids in sorted(domain_groups.items()):
        domain_name = domain_label(domain)
        clusters.append(
            ThemeCluster(
                theme_title=f"{domain_name} Developments",
                theme_summary=(f"{len(ids)} article(s) related to {domain_name.lower()}."),
                article_ids=ids,
                primary_domain=domain,
            )
        )

    return clusters[:MAX_NEWSLETTER_THEMES]


def _validate_coverage(clusters: list[ThemeCluster], articles: list[dict]) -> None:
    """Warn if any article is missing from all clusters."""
    covered = {aid for c in clusters for aid in c.article_ids}
    all_ids = {a["id"] for a in articles}
    uncovered = all_ids - covered
    if uncovered:
        logger.warning(
            "Clustering missed %d article(s): %s",
            len(uncovered),
            uncovered,
        )
