"""
DB repository for newsletter_generation_jobs — pure data access.
"""

import uuid
from typing import Any

import asyncpg

from newsletter.constants import (
    NEWSLETTER_JOB_COMPLETED,
    NEWSLETTER_JOB_FAILED,
    NEWSLETTER_JOB_PENDING,
    NEWSLETTER_JOB_PROCESSING,
)


async def create_job(conn: asyncpg.Connection, *, days: int) -> str:
    """Insert a pending job row. Returns the job ID."""
    job_id = str(uuid.uuid4())
    await conn.execute(
        """
        INSERT INTO newsletter_generation_jobs
            (id, days, status, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        """,
        job_id,
        days,
        NEWSLETTER_JOB_PENDING,
    )
    return job_id


async def get_job(conn: asyncpg.Connection, job_id: str) -> dict[str, Any] | None:
    row = await conn.fetchrow(
        "SELECT * FROM newsletter_generation_jobs WHERE id = $1",
        job_id,
    )
    return dict(row) if row else None


async def update_job_status(
    conn: asyncpg.Connection,
    job_id: str,
    status: str,
    *,
    error_message: str | None = None,
) -> None:
    valid = {
        NEWSLETTER_JOB_PENDING,
        NEWSLETTER_JOB_PROCESSING,
        NEWSLETTER_JOB_COMPLETED,
        NEWSLETTER_JOB_FAILED,
    }
    if status not in valid:
        raise ValueError(f"Invalid job status: {status}")
    await conn.execute(
        """
        UPDATE newsletter_generation_jobs
        SET status = $1, error_message = $2, updated_at = NOW()
        WHERE id = $3
        """,
        status,
        error_message,
        job_id,
    )


async def complete_job(
    conn: asyncpg.Connection,
    job_id: str,
    *,
    newsletter_id: str,
    newsletter_title: str,
) -> None:
    await conn.execute(
        """
        UPDATE newsletter_generation_jobs
        SET status = $1,
            newsletter_id = $2,
            newsletter_title = $3,
            error_message = NULL,
            updated_at = NOW()
        WHERE id = $4
        """,
        NEWSLETTER_JOB_COMPLETED,
        newsletter_id,
        newsletter_title,
        job_id,
    )
