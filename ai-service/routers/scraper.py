"""
Scraper API router — admin-only endpoints.
Trigger pipeline, view health, list articles.
"""

from fastapi import APIRouter

from scraper.pipeline import (
    get_source_health,
    get_stored_articles,
    run_pipeline,
)

router = APIRouter(prefix="/scraper", tags=["scraper"])


@router.post("/run")
async def trigger_scraper() -> dict:
    stats = await run_pipeline()
    return {"status": "completed", "stats": stats}


@router.get("/health")
async def scraper_health() -> dict:
    health = get_source_health()
    return {
        "sources": {
            name: {
                "is_healthy": h.is_healthy,
                "consecutive_failures": h.consecutive_failures,
                "total_articles": h.total_articles,
                "last_success": h.last_success.isoformat() if h.last_success else None,
            }
            for name, h in health.items()
        }
    }


@router.get("/articles")
async def list_articles(limit: int = 20) -> dict:
    articles = get_stored_articles()
    return {
        "total": len(articles),
        "articles": [
            {
                "title": a.title,
                "url": a.url,
                "summary": a.summary,
                "tags": a.tags,
                "source": a.source_name,
                "relevance": a.relevance_score,
            }
            for a in articles[:limit]
        ],
    }
