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


async def archive_and_create_versioned_artifact(
    conn: asyncpg.Connection,
    session_id: str,
    *,
    pdf_encrypted: bytes | None,
    urgency_score: int,
    peer_benchmark_percentile: float,
    findings_json: dict,
    compliance_gap_count: int | None = None,
) -> tuple[str, int]:
    """Archive existing artifact and insert a new version. Returns (new_id, new_version)."""
    existing = await get_artifact_by_session(conn, session_id)

    if existing:
        old_id = existing["id"]
        old_version = existing.get("version", 1)
        new_version = old_version + 1

        archive_id = str(uuid.uuid4())
        await conn.execute(
            """
            INSERT INTO report_artifacts
                (id, session_id, pdf_encrypted, audit_urgency_score,
                 peer_benchmark_percentile, compliance_gap_count,
                 findings_json, version, previous_id, generated_at)
            SELECT $1, session_id || '_archived_' || $2::text,
                   pdf_encrypted, audit_urgency_score,
                   peer_benchmark_percentile, compliance_gap_count,
                   findings_json, version, previous_id, generated_at
            FROM report_artifacts WHERE id = $3
            """,
            archive_id,
            old_version,
            old_id,
        )

        await conn.execute(
            """
            UPDATE report_artifacts
            SET pdf_encrypted = $1, audit_urgency_score = $2,
                peer_benchmark_percentile = $3, compliance_gap_count = $4,
                findings_json = $5, version = $6, previous_id = $7,
                generated_at = NOW()
            WHERE id = $8
            """,
            pdf_encrypted,
            urgency_score,
            peer_benchmark_percentile,
            compliance_gap_count,
            json.dumps(findings_json),
            new_version,
            archive_id,
            old_id,
        )
        return old_id, new_version

    artifact_id = await store_artifact(
        conn,
        session_id,
        pdf_encrypted=pdf_encrypted,
        urgency_score=urgency_score,
        peer_benchmark_percentile=peer_benchmark_percentile,
        findings_json=findings_json,
        compliance_gap_count=compliance_gap_count,
    )
    return artifact_id, 1


async def reset_job_for_regen(
    conn: asyncpg.Connection,
    session_id: str,
) -> str:
    """Reset existing job to pending or create a new one for regen. Returns job_id."""
    existing = await get_job_by_session(conn, session_id)
    if existing:
        await conn.execute(
            """
            UPDATE report_jobs
            SET status = $1, error_message = NULL, updated_at = NOW()
            WHERE id = $2
            """,
            REPORT_JOB_PENDING,
            existing["id"],
        )
        return existing["id"]
    return await create_job(conn, session_id)
