"""Embed threat intel summaries and persist to the embedding column."""

import logging

import asyncpg

logger = logging.getLogger(__name__)


async def embed_and_store(
    conn: asyncpg.Connection,
    article_id: str,
    summary: str,
    embed_fn,
) -> bool:
    """Generate embedding for a summary and store it on the threat_intel row.

    Args:
        conn: asyncpg connection.
        article_id: ID of the threat_intel row.
        summary: Text to embed.
        embed_fn: async callable(str) -> list[float].

    Returns:
        True if embedding was stored, False on failure.
    """
    try:
        vector = await embed_fn(summary)
        vector_str = "[" + ",".join(str(v) for v in vector) + "]"
        await conn.execute(
            "UPDATE threat_intel SET embedding = $1::vector WHERE id = $2",
            vector_str,
            article_id,
        )
        return True
    except (OSError, ValueError, asyncpg.PostgresError) as e:
        logger.warning("Failed to embed article %s: %s", article_id, e)
        return False


async def backfill_embeddings(
    pool: asyncpg.Pool,
    embed_fn,
    batch_size: int = 50,
) -> dict:
    """Backfill embeddings for threat_intel rows that lack them.

    Returns:
        Dict with counts: embedded, failed, total_missing.
    """
    stats = {"embedded": 0, "failed": 0, "total_missing": 0}

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, summary FROM threat_intel
            WHERE embedding IS NULL AND soft_deleted = FALSE
            ORDER BY scraped_at DESC
            LIMIT $1
            """,
            batch_size,
        )
        stats["total_missing"] = len(rows)

        for row in rows:
            ok = await embed_and_store(conn, row["id"], row["summary"], embed_fn)
            if ok:
                stats["embedded"] += 1
            else:
                stats["failed"] += 1

    return stats
