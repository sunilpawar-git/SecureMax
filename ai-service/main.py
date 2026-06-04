"""
Raivan Global AI Service — FastAPI entry point.
Handles Gemini API calls, pgvector search, and scraper orchestration.
"""

import logging
import os
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth_middleware import ServiceAuthMiddleware
from config import get_settings
from db import init_pool
from gemini_client import GeminiClient
from routers.assistant import router as assistant_router
from routers.cpp_admin import router as cpp_admin_router
from routers.linkedin import router as linkedin_router
from routers.questionnaire import router as questionnaire_router
from routers.report import router as report_router
from routers.scraper import router as scraper_router

logger = logging.getLogger(__name__)

_ENABLE_OPENAPI = os.environ.get("ENABLE_OPENAPI", "").lower() == "true"

scheduler = AsyncIOScheduler()


def _get_allowed_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    if "*" in origins:
        logger.warning(
            "CORS_ORIGINS contains '*' with allow_credentials=True — "
            "removing wildcard to prevent credential leakage"
        )
        origins = [o for o in origins if o != "*"]
    return origins


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    pool = await init_pool(settings)
    gemini = GeminiClient(settings) if settings.gemini_api_key else None
    app.state.pool = pool
    app.state.settings = settings
    app.state.gemini = gemini

    async def scheduled_scrape():
        """Daily scraper run — accesses pool directly (no request context)."""
        try:
            from routers.scraper import _make_gemini_tagger
            from scraper.pipeline import run_pipeline

            process_fn = _make_gemini_tagger(gemini) if gemini else None
            embed_fn = gemini.embed if gemini else None
            stats = await run_pipeline(pool, process_fn=process_fn, embed_fn=embed_fn)
            logger.info("Scheduled scraper completed: %s", stats)
        except Exception:
            logger.exception("Scheduled scraper failed")

    scheduler.add_job(
        scheduled_scrape,
        "cron",
        hour=18,
        minute=45,
        id="daily_scraper",
        replace_existing=True,
    )
    scheduler.start()
    app.state.scheduler = scheduler
    logger.info("APScheduler started — daily scraper at 18:45 UTC (00:15 IST)")

    yield

    scheduler.shutdown(wait=False)
    await pool.close()


app = FastAPI(
    title="Raivan Global AI Service",
    version="0.1.0",
    docs_url="/docs" if _ENABLE_OPENAPI else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(ServiceAuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Service-Key", "X-User-Id"],
)

app.include_router(assistant_router)
app.include_router(cpp_admin_router)
app.include_router(linkedin_router)
app.include_router(questionnaire_router)
app.include_router(report_router)
app.include_router(scraper_router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "raivan-ai"}
