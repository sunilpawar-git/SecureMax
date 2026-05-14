"""
CPP chunk retrieval via pgvector cosine similarity.
Embeds the query via gemini_client, then searches cpp_chunks for nearest neighbours.
"""

import logging

import asyncpg

from config import Settings
from gemini_client import GeminiClient, GeminiError
from schemas import CppChunkResult

logger = logging.getLogger(__name__)


async def get_relevant_chunks(
    query: str,
    conn: asyncpg.Connection,
    settings: Settings,
    top_k: int | None = None,
    *,
    gemini: GeminiClient | None = None,
) -> list[CppChunkResult]:
    """Embed *query* and return the top-k most similar CPP chunks."""
    k = top_k or settings.cpp_retrieval_top_k

    try:
        client = gemini or GeminiClient(settings)
        embedding = await client.embed(query, model=settings.embedding_model)
    except (GeminiError, ValueError):
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
