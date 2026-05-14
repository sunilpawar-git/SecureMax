"""
Report API router.
Endpoints: generate report, get status, get free summary, get full report.
"""

import json
import uuid
from enum import StrEnum

import asyncpg
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel

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
from crypto import decrypt, derive_key
from db import get_db
from questionnaire import get_node_map
from report.generator import generate_report_data

router = APIRouter(prefix="/report", tags=["report"])

_report_store: dict[str, dict] = {}

_settings = get_settings()
_enc_key = derive_key(_settings.encryption_key) if _settings.encryption_key else None


class ReportStatus(StrEnum):
    COMPLETED = "completed"
    FAILED = "failed"


class GenerateReportRequest(BaseModel):
    session_id: str


class GenerateReportResponse(BaseModel):
    report_id: str
    status: str


class ReportStatusResponse(BaseModel):
    report_id: str
    status: str
    progress: int = 0


def _build_report_events(raw_events: list[dict], node_map: dict) -> list[dict]:
    """Decrypt event answers and build the dict format expected by generator."""
    result = []
    for ev in raw_events:
        if not _enc_key:
            raise RuntimeError("Encryption key not configured — cannot build report")
        try:
            answer = decrypt(ev["answer_encrypted"], _enc_key)
        except (ValueError, Exception) as exc:
            node_id = ev.get("question_node_id")
            raise ValueError(
                f"Cannot decrypt answer for event {node_id}: {type(exc).__name__}"
            ) from exc
        try:
            delta = json.loads(ev["domain_score_delta"]) if ev.get("domain_score_delta") else {}
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


@router.post("/generate", response_model=GenerateReportResponse)
async def generate_report(
    req: GenerateReportRequest,
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

    existing = next(
        (r for r in _report_store.values() if r.get("session_id") == req.session_id),
        None,
    )
    if existing:
        return GenerateReportResponse(
            report_id=existing["report_id"],
            status=existing["status"],
        )

    report_id = str(uuid.uuid4())
    raw_events = await repo.get_events(conn, req.session_id)
    node_map = get_node_map(session["track"])
    events = _build_report_events(raw_events, node_map)

    session_for_report = dict(session)
    session_for_report["events"] = events
    session_for_report["session_id"] = req.session_id
    report_data = generate_report_data(session_for_report)

    _report_store[report_id] = {
        "report_id": report_id,
        "session_id": req.session_id,
        "status": ReportStatus.COMPLETED,
        "data": report_data,
    }

    return GenerateReportResponse(
        report_id=report_id,
        status=ReportStatus.COMPLETED,
    )


@router.get("/{report_id}/status", response_model=ReportStatusResponse)
async def get_report_status(report_id: str) -> ReportStatusResponse:
    report = _report_store.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail=ERR_REPORT_NOT_FOUND)
    progress = 100 if report["status"] == ReportStatus.COMPLETED else 50
    return ReportStatusResponse(
        report_id=report_id,
        status=report["status"],
        progress=progress,
    )


@router.get("/{report_id}/summary")
async def get_free_summary(report_id: str) -> dict:
    report = _report_store.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail=ERR_REPORT_NOT_FOUND)
    if report["status"] != ReportStatus.COMPLETED:
        raise HTTPException(status_code=202, detail=ERR_REPORT_STILL_GENERATING)
    return report["data"].get("free_summary", {})


@router.get("/{report_id}/full")
async def get_full_report(
    report_id: str,
    x_user_id: str | None = Header(None),
    conn: asyncpg.Connection = Depends(get_db),  # noqa: B008
) -> dict:
    """
    Return the full paid report.
    Access is gated on the DB flag `enterprise_report_unlocked` set by the
    Next.js payment webhook after Razorpay verification — never a client param.
    """
    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=ERR_ACCESS_DENIED)
    report = _report_store.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail=ERR_REPORT_NOT_FOUND)
    if report["status"] != ReportStatus.COMPLETED:
        raise HTTPException(status_code=202, detail=ERR_REPORT_STILL_GENERATING)
    session = await repo.get_session(conn, report["session_id"])
    if not session or session["user_id"] != x_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERR_ACCESS_DENIED)
    if not session.get("enterprise_report_unlocked", False):
        raise HTTPException(status_code=402, detail=ERR_PAYMENT_REQUIRED)
    return report["data"].get("sections", {})


def reset_report_store() -> None:
    _report_store.clear()
