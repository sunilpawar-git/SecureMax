"""
CPP chunk retrieval via pgvector cosine similarity.
Embeds the query with Gemini, then searches cpp_chunks for nearest neighbours.
"""

import logging

import asyncpg
from google import genai

from config import Settings
from schemas import CppChunkResult

logger = logging.getLogger(__name__)


async def get_relevant_chunks(
    query: str,
    conn: asyncpg.Connection,
    settings: Settings,
    top_k: int | None = None,
) -> list[CppChunkResult]:
    """Embed *query* and return the top-k most similar CPP chunks."""
    k = top_k or settings.cpp_retrieval_top_k

    try:
        embedding = await _embed_query(query, settings)
    except Exception:
        logger.warning("Gemini embedding failed for CPP retrieval", exc_info=True)
        return []

    embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"

    rows = await conn.fetch(
        """
        SELECT id, domain, section, chunk_text
        FROM cpp_chunks
        ORDER BY embedding <=> $1::vector
        LIMIT $2
        """,
        embedding_str,
        k,
    )

    return [
        CppChunkResult(
            id=row["id"],
            domain=row["domain"],
            section=row["section"],
            chunk_text=row["chunk_text"],
        )
        for row in rows
    ]


async def _embed_query(query: str, settings: Settings) -> list[float]:
    """Generate embedding for a single query string via Gemini.

    The underlying SDK call is synchronous; it is dispatched to a thread pool
    via asyncio.to_thread so the event loop is never blocked.
    """
    import asyncio

    def _sync_embed() -> list[float]:
        client = genai.Client(api_key=settings.gemini_api_key)
        result = client.models.embed_content(
            model=settings.embedding_model,
            contents=query,
        )
        return list(result.embeddings[0].values)

    return await asyncio.to_thread(_sync_embed)
