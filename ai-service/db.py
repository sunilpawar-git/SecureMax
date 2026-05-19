"""
Database connection pool lifecycle for FastAPI.
Pool lives on app.state; injected into routes via Depends(get_db).
"""

from collections.abc import AsyncGenerator

import asyncpg
from fastapi import Request

from config import Settings


async def init_pool(settings: Settings) -> asyncpg.Pool:
    """Create an asyncpg connection pool. Called once at app startup.

    Strips Prisma-only params (schema=) that asyncpg does not accept.
    """
    from urllib.parse import urlparse, urlencode, parse_qs, urlunparse

    raw = settings.database_url.replace("+asyncpg", "")
    parsed = urlparse(raw)
    params = {k: v for k, v in parse_qs(parsed.query).items() if k != "schema"}
    clean_query = urlencode({k: v[0] for k, v in params.items()})
    dsn = urlunparse(parsed._replace(query=clean_query))
    return await asyncpg.create_pool(dsn, min_size=2, max_size=10)


async def get_db(request: Request) -> AsyncGenerator[asyncpg.Connection, None]:
    """FastAPI dependency — acquires a connection from the pool for one request."""
    pool: asyncpg.Pool = request.app.state.pool
    async with pool.acquire() as conn:
        yield conn
