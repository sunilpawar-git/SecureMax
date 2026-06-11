"""
Pass 2 — Analyze & Enrich: deepen each theme cluster with CPP context
and segment-specific impact analysis.
"""

import json
import logging
import re

from newsletter.models import EnrichedTheme, SegmentImpact, ThemeCluster
from newsletter.prompts import ENRICH_PROMPT

logger = logging.getLogger(__name__)

_FENCE_RE = re.compile(r"^```[a-z]*\n?|\n?```$")


async def enrich_themes(
    clusters: list[ThemeCluster],
    articles: list[dict],
    *,
    gemini,
    cpp_retrieve=None,
) -> list[EnrichedTheme]:
    """Enrich each cluster with CPP context and SITREP analysis."""
    article_map = {a["id"]: a for a in articles}
    results: list[EnrichedTheme] = []

    for cluster in clusters:
        enriched = await _enrich_single(
            cluster, article_map, gemini=gemini, cpp_retrieve=cpp_retrieve
        )
        results.append(enriched)

    return results


async def _enrich_single(
    cluster: ThemeCluster,
    article_map: dict[str, dict],
    *,
    gemini,
    cpp_retrieve=None,
) -> EnrichedTheme:
    """Enrich a single cluster. Falls back on Gemini failure."""
    article_details = _format_articles(cluster, article_map)
    cpp_context = await _fetch_cpp_context(cluster, cpp_retrieve)

    prompt = ENRICH_PROMPT.safe_substitute(
        theme_title=cluster.theme_title,
        theme_summary=cluster.theme_summary,
        article_details=article_details,
        cpp_context=cpp_context or "No CPP context available.",
    )

    try:
        raw = await gemini.generate(prompt)
        cleaned = _FENCE_RE.sub("", raw.strip()).strip()
        parsed = json.loads(cleaned)

        seg = parsed.get("segment_impact", {})
        return EnrichedTheme(
            theme_title=cluster.theme_title,
            situation=parsed["situation"],
            assessment=parsed["assessment"],
            implications=parsed["implications"],
            recommendation=parsed["recommendation"],
            cpp_domain=cluster.primary_domain,
            cpp_citation=parsed.get("cpp_citation", ""),
            segment_impact=SegmentImpact(**seg) if seg else SegmentImpact(),
            source_article_ids=cluster.article_ids,
        )
    except Exception as e:
        logger.warning("Gemini enrichment failed for '%s': %s", cluster.theme_title, e)
        return _fallback_enrich(cluster, article_map)


def _format_articles(cluster: ThemeCluster, article_map: dict) -> str:
    lines = []
    for aid in cluster.article_ids:
        a = article_map.get(aid)
        if a:
            lines.append(f"- {a['title']}: {a.get('summary', '')[:200]}")
    return "\n".join(lines) or "No article details available."


async def _fetch_cpp_context(cluster: ThemeCluster, cpp_retrieve) -> str:
    """Retrieve CPP chunks for the cluster's primary domain."""
    if cpp_retrieve is None:
        return ""

    try:
        chunks = await cpp_retrieve(
            query=cluster.theme_summary,
            domains=[cluster.primary_domain] + cluster.secondary_domains,
        )
        if not chunks:
            return ""
        return "\n\n".join(
            f"[{c.domain} / {c.section}]: {c.chunk_text}" for c in chunks
        )
    except Exception as e:
        logger.warning("CPP retrieval failed: %s", e)
        return ""


def _fallback_enrich(
    cluster: ThemeCluster, article_map: dict
) -> EnrichedTheme:
    """Deterministic fallback — structure from cluster metadata only."""
    titles = [
        article_map[aid]["title"]
        for aid in cluster.article_ids
        if aid in article_map
    ]
    title_list = "; ".join(titles[:3])
    return EnrichedTheme(
        theme_title=cluster.theme_title,
        situation=f"This week, {len(titles)} incident(s) related to "
        f"{cluster.theme_summary}",
        assessment=f"Articles covered: {title_list}.",
        implications="Review existing security controls in this domain.",
        recommendation="Conduct a targeted security review aligned with "
        f"{cluster.primary_domain} guidelines.",
        cpp_domain=cluster.primary_domain,
        source_article_ids=cluster.article_ids,
    )
