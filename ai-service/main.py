"""
Raivan Global AI Service — FastAPI entry point.
Handles Gemini API calls, pgvector search, and scraper orchestration.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth_middleware import ServiceAuthMiddleware
from config import get_settings
from routers.questionnaire import router as questionnaire_router
from routers.report import router as report_router
from routers.scraper import router as scraper_router

settings = get_settings()

ALLOWED_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")

app = FastAPI(
    title="Raivan Global AI Service",
    version="0.1.0",
    docs_url="/docs" if not settings.gemini_api_key else None,
    redoc_url=None,
)

app.add_middleware(ServiceAuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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
