"""
Database connection pool lifecycle for FastAPI.
Pool lives on app.state; injected into routes via Depends(get_db).
"""

from collections.abc import AsyncGenerator
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

import asyncpg
from fastapi import Request

from config import Settings


def clean_database_dsn(raw_url: str) -> str:
    """Return an asyncpg-compatible DSN.

    Strips Prisma-only query params (e.g. schema=) that asyncpg rejects.
    """
    parsed = urlparse(raw_url.replace("+asyncpg", ""))
    params = {k: v for k, v in parse_qs(parsed.query).items() if k != "schema"}
    clean_query = urlencode({k: v[0] for k, v in params.items()})
    return urlunparse(parsed._replace(query=clean_query))


def parse_database_name(raw_url: str) -> str:
    """Extract the PostgreSQL database name from a DATABASE_URL."""
    parsed = urlparse(raw_url.replace("+asyncpg", ""))
    name = parsed.path.lstrip("/").split("?")[0]
    if not name:
        raise ValueError(f"Could not parse database name from URL: {raw_url!r}")
    return name


async def init_pool(settings: Settings) -> asyncpg.Pool:
    """Create an asyncpg connection pool. Called once at app startup."""
    dsn = clean_database_dsn(settings.database_url)
    return await asyncpg.create_pool(dsn, min_size=2, max_size=10)


async def init_scraper_pool(settings: Settings) -> asyncpg.Pool:
    """Pool for the scraper pipeline — uses scraper_user role (threat_intel writes)."""
    dsn = clean_database_dsn(settings.get_scraper_url())
    return await asyncpg.create_pool(dsn, min_size=1, max_size=5)


async def get_db(request: Request) -> AsyncGenerator[asyncpg.Connection, None]:
    """FastAPI dependency — acquires a connection from the pool for one request."""
    pool: asyncpg.Pool = request.app.state.pool
    async with pool.acquire() as conn:
        yield conn
