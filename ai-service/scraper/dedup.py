"""
Deduplication engine for threat intel articles.
DB-backed: checks threat_intel table for existing URL or content_hash.
"""

import asyncpg


async def is_duplicate(url: str, content_hash: str, pool: asyncpg.Pool) -> bool:
    """Check if an article with the same URL or content hash already exists."""
    async with pool.acquire() as conn:
        row = await conn.fetchval(
            "SELECT 1 FROM threat_intel WHERE url = $1 OR content_hash = $2 LIMIT 1",
            url,
            content_hash,
        )
        return row is not None


class InMemoryDedupStore:
    """Fallback for tests that don't have a DB connection."""

    def __init__(self) -> None:
        self._urls: set[str] = set()
        self._hashes: set[str] = set()

    def is_duplicate(self, url: str, content_hash: str) -> bool:
        return url in self._urls or content_hash in self._hashes

    def mark_seen(self, url: str, content_hash: str) -> None:
        self._urls.add(url)
        self._hashes.add(content_hash)

    def reset(self) -> None:
        self._urls.clear()
        self._hashes.clear()

    @property
    def count(self) -> int:
        return len(self._urls)
