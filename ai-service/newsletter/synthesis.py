"""
Newsletter content synthesis — multi-pass intelligence pipeline.
Pass 1: Cluster articles by security theme.
Pass 2: Enrich each theme with CPP context and segment analysis.
Pass 3: Compose tiered newsletter with editorial voice.
"""

import logging

from newsletter.clustering import cluster_articles
from newsletter.composer import compose_newsletter
from newsletter.enrichment import enrich_themes
from newsletter.models import NewsletterContent

logger = logging.getLogger(__name__)


async def synthesize_newsletter_pipeline(
    articles: list[dict],
    *,
    gemini,
    cpp_retrieve=None,
) -> NewsletterContent:
    """Three-pass synthesis: Cluster → Enrich → Compose."""
    clusters = await cluster_articles(articles, gemini=gemini)
    themes = await enrich_themes(clusters, articles, gemini=gemini, cpp_retrieve=cpp_retrieve)
    content = await compose_newsletter(themes, gemini=gemini)
    return content
