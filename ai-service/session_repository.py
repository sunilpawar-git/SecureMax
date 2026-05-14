"""
Async DB repository for audit sessions and session events.
Pure data access — no business logic, no encryption (caller encrypts).
All queries use $N parameterisation; no string interpolation.
"""

import json
import logging
import uuid
from typing import Any

import asyncpg

from crypto import decrypt

logger = logging.getLogger(__name__)

from constants import (
    SESSION_ABANDONED,
    SESSION_COMPLETED,
    SESSION_IN_PROGRESS,
    TABLE_AUDIT_SESSIONS,
    TABLE_SESSION_EVENTS,
)
from scoring import compute_radar_scores


async def create_session(
    conn: asyncpg.Connection,
    user_id: str,
    track: str,
) -> str:
    """Insert a new audit session. Returns the session ID."""
    session_id = str(uuid.uuid4())
    await conn.execute(
        f"""
        INSERT INTO {TABLE_AUDIT_SESSIONS}
            (id, user_id, track, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        """,
        session_id,
        user_id,
        track,
        SESSION_IN_PROGRESS,
    )
    return session_id


async def get_session(
    conn: asyncpg.Connection,
    session_id: str,
) -> dict[str, Any] | None:
    """Fetch a session by ID. Returns None if not found."""
    row = await conn.fetchrow(
        f"SELECT * FROM {TABLE_AUDIT_SESSIONS} WHERE id = $1",
        session_id,
    )
    if not row:
        return None
    return dict(row)


async def get_active_session(
    conn: asyncpg.Connection,
    user_id: str,
) -> dict[str, Any] | None:
    """Return the first in-progress session for a user, or None."""
    row = await conn.fetchrow(
        f"""
        SELECT * FROM {TABLE_AUDIT_SESSIONS}
        WHERE user_id = $1 AND status = $2
        LIMIT 1
        """,
        user_id,
        SESSION_IN_PROGRESS,
    )
    if not row:
        return None
    return dict(row)


async def set_current_node(
    conn: asyncpg.Connection,
    session_id: str,
    node_id: str,
) -> None:
    """Update the current question node for a session."""
    await conn.execute(
        f"""
        UPDATE {TABLE_AUDIT_SESSIONS}
        SET current_node_id = $1, updated_at = NOW()
        WHERE id = $2
        """,
        node_id,
        session_id,
    )


async def record_event(
    conn: asyncpg.Connection,
    session_id: str,
    question_id: str,
    answer_encrypted: str,
    domain: str,
    *,
    ai_reasoning_encrypted: str | None = None,
    cpp_citations: list[str] | None = None,
    domain_score_delta: dict | None = None,
) -> None:
    """Insert an immutable session event row."""
    event_id = str(uuid.uuid4())
    await conn.execute(
        f"""
        INSERT INTO {TABLE_SESSION_EVENTS}
            (id, session_id, question_node_id, answer_encrypted,
             ai_reasoning_encrypted, cpp_citations,
             domain_score_delta, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        """,
        event_id,
        session_id,
        question_id,
        answer_encrypted,
        ai_reasoning_encrypted,
        json.dumps(cpp_citations) if cpp_citations else None,
        json.dumps(domain_score_delta) if domain_score_delta else None,
    )


async def get_events(
    conn: asyncpg.Connection,
    session_id: str,
) -> list[dict[str, Any]]:
    """Return all events for a session, ordered by creation time."""
    rows = await conn.fetch(
        f"""
        SELECT * FROM {TABLE_SESSION_EVENTS}
        WHERE session_id = $1
        ORDER BY created_at ASC
        """,
        session_id,
    )
    return [dict(r) for r in rows]


async def complete_session(
    conn: asyncpg.Connection,
    session_id: str,
) -> None:
    """Mark a session as completed."""
    await conn.execute(
        f"""
        UPDATE {TABLE_AUDIT_SESSIONS}
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        """,
        SESSION_COMPLETED,
        session_id,
    )


async def abandon_session(
    conn: asyncpg.Connection,
    session_id: str,
) -> None:
    """Mark a session as abandoned."""
    await conn.execute(
        f"""
        UPDATE {TABLE_AUDIT_SESSIONS}
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        """,
        SESSION_ABANDONED,
        session_id,
    )


async def get_radar_scores(
    conn: asyncpg.Connection,
    session_id: str,
    encryption_key: bytes,
) -> dict[str, float]:
    """Compute radar scores from persisted events."""
    rows = await conn.fetch(
        f"""
        SELECT question_node_id, answer_encrypted, domain_score_delta
        FROM {TABLE_SESSION_EVENTS}
        WHERE session_id = $1
        ORDER BY created_at ASC
        """,
        session_id,
    )
    events: list[dict] = []
    for row in rows:
        answer = decrypt(row["answer_encrypted"], encryption_key)
        try:
            delta = json.loads(row["domain_score_delta"]) if row["domain_score_delta"] else {}
        except (json.JSONDecodeError, TypeError):
            logger.warning("Corrupt domain_score_delta for session %s — skipping delta", session_id)
            delta = {}
        events.append(
            {
                "question_id": row["question_node_id"],
                "answer": answer,
                "domain": delta.get("domain", ""),
                "score_drop_trigger": delta.get("score_drop_trigger", False),
            }
        )
    return compute_radar_scores(events)
