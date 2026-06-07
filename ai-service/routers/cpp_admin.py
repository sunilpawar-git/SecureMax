"""
Admin endpoints for CPP knowledge base management.
POST /admin/cpp/ingest — upload markdown, chunk, embed, insert (delta-only).
GET  /admin/cpp/stats  — per-domain chunk counts.
"""

import logging
import uuid

import asyncpg
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile

from chunker import chunk_document
from config import CPP_DOMAINS, get_settings
from db import get_db
from gemini_client import GeminiClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/cpp", tags=["admin-cpp"])

_MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("/ingest")
async def ingest_cpp_document(
    request: Request,
    file: UploadFile = File(...),  # noqa: B008
    domain: str = Form(...),  # noqa: B008
    conn: asyncpg.Connection = Depends(get_db),  # noqa: B008
):
    """Ingest a markdown document into CPP chunks.
    Delta processing: only inserts chunks with new content_hash values."""
    if domain not in CPP_DOMAINS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid domain. Valid: {list(CPP_DOMAINS.keys())}",
        )

    raw_bytes = await file.read()
    if len(raw_bytes) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {_MAX_UPLOAD_BYTES // (1024 * 1024)} MB",
        )
    try:
        text = raw_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail="File is not valid UTF-8. Please upload a UTF-8 encoded markdown file.",
        ) from exc

    chunks = chunk_document(text, domain)
    if not chunks:
        return {"status": "empty", "inserted": 0, "skipped": 0}

    settings = get_settings()
    gemini = GeminiClient(settings)

    existing_hashes = {
        row["content_hash"]
        for row in await conn.fetch("SELECT content_hash FROM cpp_chunks WHERE domain = $1", domain)
    }

    inserted = 0
    skipped = 0

    for chunk in chunks:
        if chunk["content_hash"] in existing_hashes:
            skipped += 1
            continue

        try:
            embedding = await gemini.embed(chunk["chunk_text"], model=settings.embedding_model)
            embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"

            await conn.execute(
                """
                INSERT INTO cpp_chunks (id, domain, section, chunk_text, embedding, content_hash)
                VALUES ($1, $2, $3, $4, $5::vector, $6)
                ON CONFLICT (content_hash) DO NOTHING
                """,
                str(uuid.uuid4()),
                chunk["domain"],
                chunk["section"],
                chunk["chunk_text"],
                embedding_str,
                chunk["content_hash"],
            )
            inserted += 1
        except (asyncpg.PostgresError, ValueError, OSError):
            logger.warning("Failed to embed/insert chunk for %s", domain, exc_info=True)

    logger.info("CPP ingest: domain=%s inserted=%d skipped=%d", domain, inserted, skipped)
    return {"status": "ok", "domain": domain, "inserted": inserted, "skipped": skipped}


@router.get("/stats")
async def get_cpp_stats(
    conn: asyncpg.Connection = Depends(get_db),  # noqa: B008
):
    """Return per-domain chunk counts and totals."""
    rows = await conn.fetch(
        "SELECT domain, COUNT(*) as count FROM cpp_chunks GROUP BY domain ORDER BY domain"
    )

    stats = {row["domain"]: row["count"] for row in rows}
    total = sum(stats.values())
    return {"domains": stats, "total": total}
