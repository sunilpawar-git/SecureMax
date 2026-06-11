"""
Scraper API router — admin-only endpoints.
Trigger pipeline, view health, list articles.
"""

import json
import logging
import re

from fastapi import APIRouter, Request

from config import get_settings
from scraper.embedder import backfill_embeddings
from scraper.pipeline import get_source_health, get_stored_articles, run_pipeline

router = APIRouter(prefix="/scraper", tags=["scraper"])
logger = logging.getLogger(__name__)

_FLASH_MODEL = get_settings().generation_model_fast


@router.post("/run")
async def trigger_scraper(request: Request) -> dict:
    pool = request.app.state.pool
    gemini = getattr(request.app.state, "gemini", None)

    process_fn = None
    embed_fn = None
    if gemini is not None:
        try:
            process_fn = _make_gemini_tagger(gemini)
            embed_fn = gemini.embed
        except Exception as e:
            logger.warning("Gemini tagger setup failed, using fallback: %s", e)

    stats = await run_pipeline(pool, process_fn=process_fn, embed_fn=embed_fn)
    return {"status": "completed", "stats": stats}


@router.get("/health")
async def scraper_health(request: Request) -> dict:
    health = get_source_health()
    next_run = None
    try:
        sched = getattr(request.app.state, "scheduler", None)
        if sched is not None:
            job = sched.get_job("daily_scraper")
            if job and job.next_run_time:
                next_run = job.next_run_time.isoformat()
    except Exception:
        logger.debug("Scheduler not available for health check")

    return {
        "sources": {
            name: {
                "is_healthy": h.is_healthy,
                "consecutive_failures": h.consecutive_failures,
                "total_articles": h.total_articles,
                "last_success": h.last_success.isoformat() if h.last_success else None,
            }
            for name, h in health.items()
        },
        "next_scheduled_run": next_run,
    }


@router.get("/articles")
async def list_articles(request: Request, limit: int = 50) -> dict:
    pool = request.app.state.pool
    articles = await get_stored_articles(pool, limit=limit)
    return {"total": len(articles), "articles": articles}


@router.post("/backfill-embeddings")
async def backfill_threat_intel_embeddings(request: Request) -> dict:
    """Backfill embeddings for threat_intel rows missing them."""
    pool = request.app.state.pool
    gemini = getattr(request.app.state, "gemini", None)

    if gemini is None:
        return {"error": "Gemini client not available", "embedded": 0}

    stats = await backfill_embeddings(pool, gemini.embed, batch_size=50)
    return {"status": "completed", "stats": stats}


def _make_gemini_tagger(gemini):
    """Returns an async callable that tags and scores articles via Gemini Flash."""
    from scraper.gatekeeper import compute_composite_score, score_article
    from scraper.models import ProcessedArticle, RawArticle

    async def tag_article(article: RawArticle) -> ProcessedArticle:
        prompt = (
            "Analyze this security news article.\n\n"
            f"Title: {article.title}\n"
            f"Content: {article.content[:800]}\n\n"
            "Return ONLY valid JSON (no markdown fences):\n"
            '{"summary": "2-3 sentence summary", '
            '"domain_tags": ["CPP-01"], '
            '"industry_tags": ["logistics"], '
            '"relevance_score": 0.75}\n\n'
            "domain_tags from: CPP-01 (Physical Security), "
            "CPP-02 (Business Principles), "
            "CPP-03 (Crisis Management), "
            "CPP-04 (Investigations), "
            "CPP-05 (Information Security), "
            "CPP-06 (Personnel Security), "
            "CPP-07 (Security Management). Pick 1-3.\n\n"
            "industry_tags from: warehouse, logistics, retail, "
            "corporate, residential, hni, technology, "
            "manufacturing, finance, hospitality, "
            "data_centre, general."
        )

        try:
            raw = await gemini.generate(prompt, model=_FLASH_MODEL)
            cleaned = re.sub(r"^```[a-z]*\n?", "", raw.strip())
            cleaned = re.sub(r"\n?```$", "", cleaned).strip()

            parsed = json.loads(cleaned)
            intel_scores = await score_article(article, gemini=gemini)
            composite = compute_composite_score(intel_scores)
            return ProcessedArticle(
                title=article.title,
                url=article.url,
                content_hash=article.content_hash,
                summary=parsed["summary"][:500],
                domain_tags=parsed["domain_tags"],
                industry_tags=parsed["industry_tags"],
                source=f"{article.source_name} ({article.source_tier})",
                relevance_score=composite,
                intel_scores=intel_scores,
                tagged_by_gemini=True,
            )
        except Exception as e:
            logger.warning("Gemini tagging failed for %s: %s", article.url, e)
            from scraper.pipeline import _fallback_process

            return _fallback_process(article)

    return tag_article
