"""
Report API router.
Endpoints: generate report, get status, get free summary, get full report.
All state persisted to report_jobs + report_artifacts tables.
PDF generation runs as a BackgroundTask.
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
from crypto import decrypt, derive_key, encrypt_bytes
from db import get_db
from gemini_client import GeminiClient
from questionnaire import get_node_map
from report.constants import (
    REPORT_JOB_COMPLETED,
    REPORT_JOB_FAILED,
    REPORT_JOB_PENDING,
    REPORT_JOB_PROCESSING,
)
from report.generator import generate_report_data
from report.renderer import render_pdf
from report.schemas import ReportData

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/report", tags=["report"])

_settings = get_settings()
_enc_key = derive_key(_settings.encryption_key) if _settings.encryption_key else None

ERR_ENCRYPTION_NOT_CONFIGURED = "Encryption key not configured — cannot store report"


class GenerateReportRequest(BaseModel):
    session_id: str


class GenerateReportResponse(BaseModel):
    report_id: str
    status: str


class ReportStatusResponse(BaseModel):
    report_id: str
    status: str
    progress: int = 0


def _is_report_unlocked(session: dict) -> bool:
    """Gate on paid (HNI Razorpay) OR enterprise_report_unlocked (enterprise webhook)."""
    return bool(session.get("paid")) or bool(
        session.get("enterprise_report_unlocked")
    )


def _build_report_events(raw_events: list[dict], node_map: dict) -> list[dict]:
    """Decrypt event answers and build the dict format expected by generator."""
    result = []
    for ev in raw_events:
        if not _enc_key:
            raise RuntimeError(ERR_ENCRYPTION_NOT_CONFIGURED)
        try:
            answer = decrypt(ev["answer_encrypted"], _enc_key)
        except (ValueError, Exception) as exc:
            node_id = ev.get("question_node_id")
            raise ValueError(
                f"Cannot decrypt answer for event {node_id}"
            ) from exc
        try:
            delta = (
                json.loads(ev["domain_score_delta"])
                if ev.get("domain_score_delta")
                else {}
            )
        except (json.JSONDecodeError, TypeError):
            delta = {}
        node = node_map.get(ev["question_node_id"], {})
        result.append(
            {
                "domain": delta.get("domain", ""),
                "question_text": node.get("text", ev["question_node_id"]),
                "answer": answer,
                "score_drop_trigger": delta.get("score_drop_trigger", False),
            }
        )
    return result


async def _generate_report_background(
    pool: asyncpg.Pool,
    job_id: str,
    session_id: str,
    session_data: dict,
    events: list[dict],
) -> None:
    """Background task: generate report data, render PDF, encrypt, store."""
    # A1: fail-closed — never store a report without encryption
    if not _enc_key:
        logger.error(
            "Report generation aborted for session %s: encryption key not set",
            session_id[:8],
        )
        async with pool.acquire() as conn:
            await rpt_repo.update_job_status(
                conn, job_id, REPORT_JOB_FAILED,
                error_message=ERR_ENCRYPTION_NOT_CONFIGURED,
            )
        return

    async with pool.acquire() as conn:
        try:
            await rpt_repo.update_job_status(conn, job_id, REPORT_JOB_PROCESSING)

            session_for_report = dict(session_data)
            session_for_report["events"] = events
            session_for_report["session_id"] = session_id

            gemini = _build_gemini()
            report_data = await generate_report_data(
                session_for_report,
                gemini=gemini,
                conn=conn,
                settings=_settings,
            )

            pdf_bytes = await _render_pdf_safe(report_data)
            # pdf_bytes is None only when Playwright failed — store NULL
            pdf_enc = encrypt_bytes(pdf_bytes, _enc_key) if pdf_bytes else None

            await rpt_repo.store_artifact(
                conn,
                session_id,
                pdf_encrypted=pdf_enc,
                urgency_score=report_data.urgency_score,
                peer_benchmark_percentile=report_data.peer_benchmark_percentile,
                findings_json=report_data.model_dump(mode="json"),  # C1
                compliance_gap_count=report_data.compliance_gap_count,
            )
            await rpt_repo.update_job_status(conn, job_id, REPORT_JOB_COMPLETED)

        except Exception:
            logger.exception(
                "Background report generation failed for session %s",
                session_id[:8],  # C7: truncate session_id in logs
            )
            await rpt_repo.update_job_status(
                conn, job_id, REPORT_JOB_FAILED, error_message="Generation failed"
            )


async def _render_pdf_safe(report_data: ReportData) -> bytes | None:
    """Render PDF via Playwright. Returns None on failure — caller stores NULL."""
    try:
        return await render_pdf(report_data)
    except Exception:
        logger.warning(
            "PDF rendering failed for session %s", report_data.session_id[:8]
        )
        return None


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
    events = _build_report_events(raw_events, node_map)

    pool: asyncpg.Pool = request.app.state.pool
    background_tasks.add_task(
        _generate_report_background,
        pool,
        job_id,
        req.session_id,
        dict(session),
        events,
    )

    return GenerateReportResponse(
        report_id=job_id, status=REPORT_JOB_PENDING
    )


@router.get("/{report_id}/status", response_model=ReportStatusResponse)
async def get_report_status(
    report_id: str,
    x_user_id: str | None = Header(None),  # A4
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
    )


@router.get("/{report_id}/summary")
async def get_free_summary(
    report_id: str,
    x_user_id: str | None = Header(None),  # A4
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
    if not _is_report_unlocked(session):  # A2: paid OR enterprise_report_unlocked
        raise HTTPException(status_code=402, detail=ERR_PAYMENT_REQUIRED)
    artifact = await rpt_repo.get_artifact_by_session(conn, job["session_id"])
    if not artifact:
        raise HTTPException(status_code=404, detail=ERR_REPORT_NOT_FOUND)
    return json.loads(artifact["findings_json"])


def _build_gemini() -> GeminiClient | None:
    """Create a GeminiClient if the API key is configured."""
    if _settings.gemini_api_key:
        try:
            return GeminiClient(_settings)
        except ValueError:
            return None
    return None


def _job_progress(job_status: str) -> int:
    """Map job status to a progress percentage."""
    return {
        REPORT_JOB_PENDING: 0,
        REPORT_JOB_PROCESSING: 50,
        REPORT_JOB_COMPLETED: 100,
        REPORT_JOB_FAILED: 0,
    }.get(job_status, 0)
