"""
Report API router.
Endpoints: generate report, admin-regenerate, get status, get summary, get full report.
Background generation logic extracted to report/background.py.
"""

import json
import logging

import asyncpg
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    Header,
    HTTPException,
    Request,
    status,
)
from pydantic import BaseModel

import report_repository as rpt_repo
import session_repository as repo
from constants import (
    ERR_ACCESS_DENIED,
    ERR_PAYMENT_REQUIRED,
    ERR_REPORT_NOT_FOUND,
    ERR_REPORT_STILL_GENERATING,
    ERR_SESSION_NOT_COMPLETED,
    ERR_SESSION_NOT_FOUND,
    SESSION_COMPLETED,
)
from db import get_db
from questionnaire import get_node_map
from report.background import (
    build_report_events,
    generate_report_background,
)
from report.constants import (
    REPORT_JOB_COMPLETED,
    REPORT_JOB_PENDING,
    REPORT_JOB_PROCESSING,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/report", tags=["report"])


class GenerateReportRequest(BaseModel):
    session_id: str


class GenerateReportResponse(BaseModel):
    report_id: str
    status: str


class ReportStatusResponse(BaseModel):
    report_id: str
    status: str
    progress: int = 0
    downloadable: bool = False


class AdminRegenerateRequest(BaseModel):
    session_id: str


def _is_report_unlocked(session: dict) -> bool:
    """Gate on paid (HNI Razorpay) OR enterprise_report_unlocked (enterprise webhook)."""
    return bool(session.get("paid")) or bool(
        session.get("enterprise_report_unlocked")
    )


@router.post("/generate", response_model=GenerateReportResponse)
async def generate_report(
    req: GenerateReportRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    x_user_id: str | None = Header(None),
    conn: asyncpg.Connection = Depends(get_db),  # noqa: B008
) -> GenerateReportResponse:
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=ERR_ACCESS_DENIED
        )
    session = await repo.get_session(conn, req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail=ERR_SESSION_NOT_FOUND)
    if session["user_id"] != x_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=ERR_ACCESS_DENIED
        )
    if session["status"] != SESSION_COMPLETED:
        raise HTTPException(status_code=400, detail=ERR_SESSION_NOT_COMPLETED)

    existing = await rpt_repo.get_job_by_session(conn, req.session_id)
    if existing:
        return GenerateReportResponse(
            report_id=existing["id"], status=existing["status"]
        )

    job_id = await rpt_repo.create_job(conn, req.session_id)

    raw_events = await repo.get_events(conn, req.session_id)
    node_map = get_node_map(session["track"])
    events = build_report_events(raw_events, node_map)

    pool: asyncpg.Pool = request.app.state.pool
    background_tasks.add_task(
        generate_report_background,
        pool, job_id, req.session_id, dict(session), events,
    )

    return GenerateReportResponse(
        report_id=job_id, status=REPORT_JOB_PENDING
    )


@router.post("/admin-regenerate", response_model=GenerateReportResponse)
async def admin_regenerate_report(
    req: AdminRegenerateRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    conn: asyncpg.Connection = Depends(get_db),  # noqa: B008
) -> GenerateReportResponse:
    """Admin-only report regeneration. Auth via X-Service-Key (middleware)."""
    session = await repo.get_session(conn, req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail=ERR_SESSION_NOT_FOUND)
    if session["status"] != SESSION_COMPLETED:
        raise HTTPException(status_code=400, detail=ERR_SESSION_NOT_COMPLETED)

    job_id = await rpt_repo.reset_job_for_regen(conn, req.session_id)

    raw_events = await repo.get_events(conn, req.session_id)
    node_map = get_node_map(session["track"])
    events = build_report_events(raw_events, node_map)

    pool: asyncpg.Pool = request.app.state.pool
    background_tasks.add_task(
        generate_report_background,
        pool, job_id, req.session_id, dict(session), events,
        versioned=True,
    )

    return GenerateReportResponse(
        report_id=job_id, status=REPORT_JOB_PENDING
    )


@router.get("/{report_id}/status", response_model=ReportStatusResponse)
async def get_report_status(
    report_id: str,
    x_user_id: str | None = Header(None),
    conn: asyncpg.Connection = Depends(get_db),  # noqa: B008
) -> ReportStatusResponse:
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=ERR_ACCESS_DENIED
        )
    job = await rpt_repo.get_job(conn, report_id)
    if not job:
        raise HTTPException(status_code=404, detail=ERR_REPORT_NOT_FOUND)
    session = await repo.get_session(conn, job["session_id"])
    if not session or session["user_id"] != x_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=ERR_ACCESS_DENIED
        )
    return ReportStatusResponse(
        report_id=report_id,
        status=job["status"],
        progress=_job_progress(job["status"]),
        downloadable=_is_report_unlocked(session),
    )


@router.get("/{report_id}/summary")
async def get_free_summary(
    report_id: str,
    x_user_id: str | None = Header(None),
    conn: asyncpg.Connection = Depends(get_db),  # noqa: B008
) -> dict:
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=ERR_ACCESS_DENIED
        )
    job = await rpt_repo.get_job(conn, report_id)
    if not job:
        raise HTTPException(status_code=404, detail=ERR_REPORT_NOT_FOUND)
    session = await repo.get_session(conn, job["session_id"])
    if not session or session["user_id"] != x_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=ERR_ACCESS_DENIED
        )
    if job["status"] != REPORT_JOB_COMPLETED:
        raise HTTPException(status_code=202, detail=ERR_REPORT_STILL_GENERATING)
    artifact = await rpt_repo.get_artifact_by_session(conn, job["session_id"])
    if not artifact:
        raise HTTPException(status_code=404, detail=ERR_REPORT_NOT_FOUND)
    findings = json.loads(artifact["findings_json"])
    return findings.get("free_summary", {})


@router.get("/{report_id}/full")
async def get_full_report(
    report_id: str,
    x_user_id: str | None = Header(None),
    conn: asyncpg.Connection = Depends(get_db),  # noqa: B008
) -> dict:
    """Full paid report — gated on DB payment flag, never a client param."""
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=ERR_ACCESS_DENIED
        )
    job = await rpt_repo.get_job(conn, report_id)
    if not job:
        raise HTTPException(status_code=404, detail=ERR_REPORT_NOT_FOUND)
    if job["status"] != REPORT_JOB_COMPLETED:
        raise HTTPException(status_code=202, detail=ERR_REPORT_STILL_GENERATING)
    session = await repo.get_session(conn, job["session_id"])
    if not session or session["user_id"] != x_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=ERR_ACCESS_DENIED
        )
    if not _is_report_unlocked(session):
        raise HTTPException(status_code=402, detail=ERR_PAYMENT_REQUIRED)
    artifact = await rpt_repo.get_artifact_by_session(conn, job["session_id"])
    if not artifact:
        raise HTTPException(status_code=404, detail=ERR_REPORT_NOT_FOUND)
    return json.loads(artifact["findings_json"])


def _job_progress(job_status: str) -> int:
    """Map job status to a progress percentage."""
    return {
        REPORT_JOB_PENDING: 0,
        REPORT_JOB_PROCESSING: 50,
        REPORT_JOB_COMPLETED: 100,
    }.get(job_status, 0)
