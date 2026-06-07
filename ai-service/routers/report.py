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
    Query,
    Request,
    status,
)
from fastapi.responses import Response
from pydantic import BaseModel

import report_repository as rpt_repo
import session_repository as repo
from config import get_settings
from constants import (
    ERR_ACCESS_DENIED,
    ERR_PAYMENT_REQUIRED,
    ERR_REPORT_NOT_FOUND,
    ERR_REPORT_STILL_GENERATING,
    ERR_SESSION_NOT_COMPLETED,
    ERR_SESSION_NOT_FOUND,
    SESSION_COMPLETED,
)
from crypto import decrypt_bytes, derive_key
from db import get_db
from questionnaire import get_node_map
from report.background import (
    build_report_events,
    generate_report_background,
)
from report.checklist import generate_checklist
from report.constants import (
    REPORT_JOB_COMPLETED,
    REPORT_JOB_PENDING,
    REPORT_JOB_PROCESSING,
)
from report.schemas import ReportData

_settings = get_settings()
_enc_key = derive_key(_settings.encryption_key) if _settings.encryption_key else None

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/report", tags=["report"])


class GenerateReportRequest(BaseModel):
    session_id: str


class GenerateReportResponse(BaseModel):
    report_id: str
    status: str


class ReportStatusResponse(BaseModel):
    report_id: str
    session_id: str = ""  # audit session CUID — needed for payment URL
    status: str
    progress: int = 0
    downloadable: bool = False


class AdminRegenerateRequest(BaseModel):
    session_id: str


def _is_report_unlocked(session: dict) -> bool:
    """Gate on paid (HNI Razorpay) OR enterprise_report_unlocked (enterprise webhook)."""
    return bool(session.get("paid")) or bool(session.get("enterprise_report_unlocked"))


@router.post("/generate", response_model=GenerateReportResponse)
async def generate_report(
    req: GenerateReportRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    x_user_id: str | None = Header(None),
    conn: asyncpg.Connection = Depends(get_db),  # noqa: B008
) -> GenerateReportResponse:
    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=ERR_ACCESS_DENIED)
    session = await repo.get_session(conn, req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail=ERR_SESSION_NOT_FOUND)
    if session["user_id"] != x_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERR_ACCESS_DENIED)
    if session["status"] != SESSION_COMPLETED:
        raise HTTPException(status_code=400, detail=ERR_SESSION_NOT_COMPLETED)

    existing = await rpt_repo.get_job_by_session(conn, req.session_id)
    if existing:
        return GenerateReportResponse(report_id=existing["id"], status=existing["status"])

    job_id = await rpt_repo.create_job(conn, req.session_id)

    raw_events = await repo.get_events(conn, req.session_id)
    node_map = get_node_map(session["track"])
    events = build_report_events(raw_events, node_map)

    pool: asyncpg.Pool = request.app.state.pool
    background_tasks.add_task(
        generate_report_background,
        pool,
        job_id,
        req.session_id,
        dict(session),
        events,
    )

    return GenerateReportResponse(report_id=job_id, status=REPORT_JOB_PENDING)


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
        pool,
        job_id,
        req.session_id,
        dict(session),
        events,
        versioned=True,
    )

    return GenerateReportResponse(report_id=job_id, status=REPORT_JOB_PENDING)


@router.get("/{report_id}/status", response_model=ReportStatusResponse)
async def get_report_status(
    report_id: str,
    x_user_id: str | None = Header(None),
    conn: asyncpg.Connection = Depends(get_db),  # noqa: B008
) -> ReportStatusResponse:
    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=ERR_ACCESS_DENIED)
    job = await rpt_repo.get_job(conn, report_id)
    if not job:
        raise HTTPException(status_code=404, detail=ERR_REPORT_NOT_FOUND)
    session = await repo.get_session(conn, job["session_id"])
    if not session or session["user_id"] != x_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERR_ACCESS_DENIED)
    return ReportStatusResponse(
        report_id=report_id,
        session_id=job["session_id"],
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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=ERR_ACCESS_DENIED)
    job = await rpt_repo.get_job(conn, report_id)
    if not job:
        raise HTTPException(status_code=404, detail=ERR_REPORT_NOT_FOUND)
    session = await repo.get_session(conn, job["session_id"])
    if not session or session["user_id"] != x_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERR_ACCESS_DENIED)
    if job["status"] != REPORT_JOB_COMPLETED:
        raise HTTPException(status_code=202, detail=ERR_REPORT_STILL_GENERATING)
    artifact = await rpt_repo.get_artifact_by_session(conn, job["session_id"])
    if not artifact:
        raise HTTPException(status_code=404, detail=ERR_REPORT_NOT_FOUND)
    full = json.loads(artifact["findings_json"])
    free = full.get("free_summary") or {}
    # Shape the response to match the frontend SummaryData interface:
    # findings_preview (Python) → findings (frontend)
    # radar_scores (full report) → domain_scores (frontend)
    return {
        "findings": free.get("findings_preview", []),
        "urgency_score": free.get("urgency_score", 0),
        "domains_with_gaps": free.get("domains_with_gaps", []),
        "peer_benchmark": free.get("peer_benchmark", {}),
        "compliance_gap_count": free.get("compliance_gap_count"),
        "domain_scores": full.get("radar_scores", {}),
        "track": full.get("track", "hni"),
        "session_id": job["session_id"],  # audit session CUID — needed for payment URL
    }


@router.get("/{report_id}/full")
async def get_full_report(
    report_id: str,
    mode: str = Query(default="complete", pattern="^(complete|executive|technical)$"),
    x_user_id: str | None = Header(None),
    conn: asyncpg.Connection = Depends(get_db),  # noqa: B008
) -> Response:
    """Full paid report — decrypts and streams the PDF. Gated on DB payment flag.

    mode: "complete" (default) returns stored PDF; "executive" or "technical"
    re-renders on the fly using the stored findings_json.
    """
    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=ERR_ACCESS_DENIED)
    if not _enc_key:
        raise HTTPException(status_code=500, detail="Encryption not configured on server")
    job = await rpt_repo.get_job(conn, report_id)
    if not job:
        raise HTTPException(status_code=404, detail=ERR_REPORT_NOT_FOUND)
    if job["status"] != REPORT_JOB_COMPLETED:
        raise HTTPException(status_code=202, detail=ERR_REPORT_STILL_GENERATING)
    session = await repo.get_session(conn, job["session_id"])
    if not session or session["user_id"] != x_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERR_ACCESS_DENIED)
    if not _is_report_unlocked(session):
        raise HTTPException(status_code=402, detail=ERR_PAYMENT_REQUIRED)
    artifact = await rpt_repo.get_artifact_by_session(conn, job["session_id"])
    if not artifact:
        raise HTTPException(status_code=404, detail=ERR_REPORT_NOT_FOUND)

    if mode in ("executive", "technical"):
        # Re-render from stored findings_json without launching a full generation run.
        if not artifact.get("findings_json"):
            raise HTTPException(status_code=404, detail="Report data not available for re-render")
        from report.renderer import render_pdf  # noqa: PLC0415 (avoid circular at module level)

        report_data = ReportData.model_validate(json.loads(artifact["findings_json"]))
        pdf_bytes = await render_pdf(report_data, section_mode=mode)
    else:
        if not artifact.get("pdf_encrypted"):
            raise HTTPException(status_code=404, detail="PDF not available for this report")
        pdf_bytes = decrypt_bytes(bytes(artifact["pdf_encrypted"]), _enc_key)

        # Validate PDF magic bytes before serving — catches encryption key mismatch or corruption
        if pdf_bytes[:4] != b"%PDF":
            logger.error(
                "Decrypted artifact for session %s does not start with %%PDF — likely key mismatch",
                job["session_id"][:8],
            )
            raise HTTPException(
                status_code=500, detail="PDF data is corrupt. Please contact support."
            )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="audit_report_{report_id}.pdf"'},
    )


@router.get("/{report_id}/checklist")
async def get_checklist(
    report_id: str,
    x_user_id: str | None = Header(None),
    conn: asyncpg.Connection = Depends(get_db),  # noqa: B008
) -> dict:
    """Generate an on-site audit checklist from session findings."""
    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=ERR_ACCESS_DENIED)
    job = await rpt_repo.get_job(conn, report_id)
    if not job:
        raise HTTPException(status_code=404, detail=ERR_REPORT_NOT_FOUND)
    session = await repo.get_session(conn, job["session_id"])
    if not session or session["user_id"] != x_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERR_ACCESS_DENIED)
    if job["status"] != REPORT_JOB_COMPLETED:
        raise HTTPException(status_code=202, detail=ERR_REPORT_STILL_GENERATING)
    artifact = await rpt_repo.get_artifact_by_session(conn, job["session_id"])
    if not artifact:
        raise HTTPException(status_code=404, detail=ERR_REPORT_NOT_FOUND)

    full = json.loads(artifact["findings_json"])
    findings = full.get("findings", [])
    items = generate_checklist(findings)
    return {"session_id": job["session_id"], "items": items, "total": len(items)}


def _job_progress(job_status: str) -> int:
    """Map job status to a progress percentage."""
    return {
        REPORT_JOB_PENDING: 0,
        REPORT_JOB_PROCESSING: 50,
        REPORT_JOB_COMPLETED: 100,
    }.get(job_status, 0)
