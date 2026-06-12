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
from db import init_pool, init_scraper_pool
from gemini_client import GeminiClient
from routers.assistant import router as assistant_router
from routers.cpp_admin import router as cpp_admin_router
from routers.linkedin import router as linkedin_router
from routers.newsletter import router as newsletter_router
from routers.questionnaire import router as questionnaire_router
from routers.report import router as report_router
from routers.scraper import router as scraper_router
from schema_guard import assert_schema_ready

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
    scraper_pool = await init_scraper_pool(settings)

    if os.environ.get("IS_TESTING") != "true":
        await assert_schema_ready(pool)

    gemini = GeminiClient(settings) if settings.gemini_api_key else None
    app.state.pool = pool
    app.state.scraper_pool = scraper_pool
    app.state.settings = settings
    app.state.gemini = gemini

    async def scheduled_scrape():
        """Daily scraper run — uses scraper_pool (scraper_user role for threat_intel writes)."""
        try:
            from routers.scraper import _make_gemini_tagger
            from scraper.pipeline import run_pipeline

            process_fn = _make_gemini_tagger(gemini) if gemini else None
            embed_fn = gemini.embed if gemini else None
            stats = await run_pipeline(scraper_pool, process_fn=process_fn, embed_fn=embed_fn)
            logger.info("Scheduled scraper completed: %s", stats)
        except Exception:
            logger.exception("Scheduled scraper failed")

    async def scheduled_weekly_briefing():
        """Monday 09:30 IST (04:00 UTC) — derive LinkedIn post from latest newsletter.

        Falls back to a deterministic digest from threat_intel if no recent
        newsletter row exists (e.g. newsletter cron failed or was skipped).
        """
        try:
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    """SELECT id, executive_summary, title
                    FROM newsletters
                    WHERE status IN ('draft', 'published')
                      AND created_at >= NOW() - INTERVAL '2 days'
                    ORDER BY created_at DESC LIMIT 1"""
                )

                if row and row["executive_summary"]:
                    briefing_text = row["executive_summary"][:3000]
                    source_label = f"newsletter {row['id']}"
                else:
                    logger.warning(
                        "Weekly LinkedIn briefing — no recent newsletter; "
                        "using threat_intel fallback"
                    )
                    fallback_rows = await conn.fetch(
                        """SELECT title, summary FROM threat_intel
                        WHERE soft_deleted = FALSE
                        ORDER BY scraped_at DESC LIMIT 5"""
                    )
                    if not fallback_rows:
                        logger.warning(
                            "Weekly LinkedIn briefing skipped — "
                            "no newsletter and no threat intel found"
                        )
                        return
                    lines = ["Security Intelligence Digest\n"]
                    for r in fallback_rows:
                        lines.append(f"\u2022 {r['title']}: {(r['summary'] or '')[:200]}")
                    lines.append(
                        "\nIs your organization prepared? Book a professional security audit."
                    )
                    briefing_text = "\n".join(lines)[:3000]
                    source_label = "threat_intel fallback"

                await conn.execute(
                    """INSERT INTO linkedin_posts
                       (id, draft_text, status, platform, created_at, updated_at)
                       VALUES (gen_random_uuid(), $1, 'draft', 'linkedin', NOW(), NOW())""",
                    briefing_text,
                )
            logger.info("Weekly LinkedIn briefing drafted from %s", source_label)
        except Exception:
            logger.exception("Weekly LinkedIn briefing failed")

    scheduler.add_job(
        scheduled_scrape,
        "cron",
        hour=2,
        minute=30,
        id="daily_scraper",
        replace_existing=True,
    )  # 02:30 UTC = 08:00 IST — fresh intel before the workday starts
    scheduler.add_job(
        scheduled_weekly_briefing,
        "cron",
        day_of_week="mon",
        hour=4,
        minute=0,
        id="weekly_linkedin_briefing",
        replace_existing=True,
    )

    async def scheduled_weekly_newsletter():
        """Monday 08:30 IST (03:00 UTC) — draft the weekly newsletter for admin review."""
        try:
            from fastapi import HTTPException

            from routers.newsletter import create_newsletter_draft

            if not gemini:
                logger.warning("Weekly newsletter skipped — Gemini not configured")
                return
            try:
                result = await create_newsletter_draft(pool, gemini, days=7)
                logger.info("Weekly newsletter drafted: %s", result["newsletter_id"])
            except HTTPException as e:
                # Rule 12: an empty intel week is logged loudly, not swallowed
                logger.warning("Weekly newsletter not drafted: %s", e.detail)
        except Exception:
            logger.exception("Weekly newsletter draft failed")

    scheduler.add_job(
        scheduled_weekly_newsletter,
        "cron",
        day_of_week="mon",
        hour=3,
        minute=0,
        id="weekly_newsletter",
        replace_existing=True,
    )
    scheduler.start()
    app.state.scheduler = scheduler
    logger.info(
        "APScheduler started — daily scraper 02:30 UTC (08:00 IST), "
        "weekly newsletter Mon 03:00 UTC (08:30 IST), "
        "weekly LinkedIn briefing Mon 04:00 UTC (09:30 IST)"
    )

    yield

    scheduler.shutdown(wait=False)
    await scraper_pool.close()
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
app.include_router(newsletter_router)
app.include_router(questionnaire_router)
app.include_router(report_router)
app.include_router(scraper_router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "raivan-ai"}
