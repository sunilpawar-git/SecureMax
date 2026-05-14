"""
Raivan Global AI Service — FastAPI entry point.
Handles Gemini API calls, pgvector search, and scraper orchestration.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth_middleware import ServiceAuthMiddleware
from config import get_settings
from db import init_pool
from routers.questionnaire import router as questionnaire_router
from routers.report import router as report_router
from routers.scraper import router as scraper_router

logger = logging.getLogger(__name__)

_ENABLE_OPENAPI = os.environ.get("ENABLE_OPENAPI", "").lower() == "true"


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
    app.state.pool = await init_pool(settings)
    yield
    await app.state.pool.close()


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

app.include_router(questionnaire_router)
app.include_router(report_router)
app.include_router(scraper_router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "raivan-ai"}
