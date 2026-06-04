"""
Startup schema validation — verifies the live DB has all columns the app
references in SQL before the service begins serving requests.

Catches schema-code drift early (missing migrations) rather than letting
INSERT/SELECT failures surface as opaque 500s at runtime.

Call `assert_schema_ready(pool)` in the FastAPI lifespan before yielding.
"""

import logging

import asyncpg

logger = logging.getLogger(__name__)

# (table, column) pairs that the app references directly in SQL.
# Add a row here whenever a migration introduces a column used by Python code.
_REQUIRED_COLUMNS: list[tuple[str, str]] = [
    # audit_sessions ─────────────────────────────────────────────────────────
    ("audit_sessions", "id"),
    ("audit_sessions", "user_id"),
    ("audit_sessions", "track"),
    ("audit_sessions", "status"),
    ("audit_sessions", "current_node_id"),
    ("audit_sessions", "graph_version"),   # migration 8 — was the missing column
    ("audit_sessions", "domain_scores"),
    ("audit_sessions", "module_scores"),
    ("audit_sessions", "paid"),
    ("audit_sessions", "report_ready"),
    ("audit_sessions", "created_at"),
    ("audit_sessions", "updated_at"),
    # session_events ──────────────────────────────────────────────────────────
    ("session_events", "id"),
    ("session_events", "session_id"),
    ("session_events", "question_node_id"),
    ("session_events", "answer_encrypted"),
    ("session_events", "ai_reasoning_encrypted"),
    ("session_events", "cpp_citations"),
    ("session_events", "domain_score_delta"),
    ("session_events", "module_score_delta"),
    ("session_events", "created_at"),
    # cpp_chunks ──────────────────────────────────────────────────────────────
    ("cpp_chunks", "id"),
    ("cpp_chunks", "domain"),
    ("cpp_chunks", "chunk_text"),
    ("cpp_chunks", "embedding"),
    # threat_intel ────────────────────────────────────────────────────────────
    ("threat_intel", "id"),
    ("threat_intel", "title"),
    ("threat_intel", "url"),
    ("threat_intel", "summary"),
    ("threat_intel", "domain_tags"),
    ("threat_intel", "relevance_score"),
    ("threat_intel", "embedding"),
    ("threat_intel", "soft_deleted"),
]


async def assert_schema_ready(pool: asyncpg.Pool) -> None:
    """Query information_schema and raise RuntimeError listing any missing columns.

    Fails fast at startup so operators see a clear message instead of runtime 500s.
    """
    tables = list({t for t, _ in _REQUIRED_COLUMNS})

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = ANY($1)
            """,
            tables,
        )

    found: set[tuple[str, str]] = {(r["table_name"], r["column_name"]) for r in rows}
    missing = [f"{t}.{c}" for t, c in _REQUIRED_COLUMNS if (t, c) not in found]

    if missing:
        msg = (
            "Schema validation failed — the following columns are missing from the "
            "database. Run the pending Prisma migrations and restart:\n  "
            + "\n  ".join(missing)
        )
        logger.critical(msg)
        raise RuntimeError(msg)

    logger.info("Schema guard passed — all %d required columns present.", len(_REQUIRED_COLUMNS))
