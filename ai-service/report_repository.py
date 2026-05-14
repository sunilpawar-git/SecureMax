"""
DB repository for report_jobs and report_artifacts tables.
Pure data access — no business logic, no encryption (caller encrypts).
"""

import json
import uuid
from typing import Any

import asyncpg

from report.constants import (
    REPORT_JOB_COMPLETED,
    REPORT_JOB_FAILED,
    REPORT_JOB_PENDING,
    REPORT_JOB_PROCESSING,
)


async def create_job(
    conn: asyncpg.Connection,
    session_id: str,
) -> str:
    """Insert a report_jobs row. Returns the job ID."""
    job_id = str(uuid.uuid4())
    await conn.execute(
        """
        INSERT INTO report_jobs (id, session_id, status, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        """,
        job_id,
        session_id,
        REPORT_JOB_PENDING,
    )
    return job_id


async def get_job(
    conn: asyncpg.Connection,
    job_id: str,
) -> dict[str, Any] | None:
    """Fetch a job by ID."""
    row = await conn.fetchrow(
        "SELECT * FROM report_jobs WHERE id = $1",
        job_id,
    )
    return dict(row) if row else None


async def get_job_by_session(
    conn: asyncpg.Connection,
    session_id: str,
) -> dict[str, Any] | None:
    """Fetch the job for a given session (unique constraint)."""
    row = await conn.fetchrow(
        "SELECT * FROM report_jobs WHERE session_id = $1",
        session_id,
    )
    return dict(row) if row else None


async def update_job_status(
    conn: asyncpg.Connection,
    job_id: str,
    status: str,
    *,
    error_message: str | None = None,
) -> None:
    """Update job status. Validates against known statuses."""
    valid = {
        REPORT_JOB_PENDING,
        REPORT_JOB_PROCESSING,
        REPORT_JOB_COMPLETED,
        REPORT_JOB_FAILED,
    }
    if status not in valid:
        raise ValueError(f"Invalid job status: {status}")
    await conn.execute(
        """
        UPDATE report_jobs
        SET status = $1, error_message = $2, updated_at = NOW()
        WHERE id = $3
        """,
        status,
        error_message,
        job_id,
    )


async def store_artifact(
    conn: asyncpg.Connection,
    session_id: str,
    *,
    pdf_encrypted: bytes | None,
    urgency_score: int,
    peer_benchmark_percentile: float,
    findings_json: dict,
    compliance_gap_count: int | None = None,
) -> str:
    """Insert a report_artifacts row. Returns the artifact ID."""
    artifact_id = str(uuid.uuid4())
    await conn.execute(
        """
        INSERT INTO report_artifacts
            (id, session_id, pdf_encrypted, audit_urgency_score,
             peer_benchmark_percentile, compliance_gap_count,
             findings_json, generated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        """,
        artifact_id,
        session_id,
        pdf_encrypted,
        urgency_score,
        peer_benchmark_percentile,
        compliance_gap_count,
        json.dumps(findings_json),
    )
    return artifact_id


async def get_artifact_by_session(
    conn: asyncpg.Connection,
    session_id: str,
) -> dict[str, Any] | None:
    """Fetch the artifact for a session."""
    row = await conn.fetchrow(
        "SELECT * FROM report_artifacts WHERE session_id = $1",
        session_id,
    )
    return dict(row) if row else None
