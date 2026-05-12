"""
Report API router.
Endpoints: generate report, get status, get free summary, get full report.
"""

import uuid
from enum import StrEnum

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from report.generator import generate_report_data

router = APIRouter(prefix="/report", tags=["report"])

_report_store: dict[str, dict] = {}


class ReportStatus(StrEnum):
    PENDING = "pending"
    GENERATING = "generating"
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


@router.post("/generate", response_model=GenerateReportResponse)
async def generate_report(req: GenerateReportRequest) -> GenerateReportResponse:
    from routers.questionnaire import store as session_store
    session = session_store.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["status"] != "completed":
        raise HTTPException(status_code=400, detail="Session not yet completed")

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
    report_data = generate_report_data(session)

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
        raise HTTPException(status_code=404, detail="Report not found")
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
        raise HTTPException(status_code=404, detail="Report not found")
    if report["status"] != ReportStatus.COMPLETED:
        raise HTTPException(status_code=202, detail="Report still generating")
    return report["data"].get("free_summary", {})


@router.get("/{report_id}/full")
async def get_full_report(report_id: str, unlocked: bool = False) -> dict:
    report = _report_store.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report["status"] != ReportStatus.COMPLETED:
        raise HTTPException(status_code=202, detail="Report still generating")
    if not unlocked:
        raise HTTPException(
            status_code=402,
            detail="Payment required to access full report",
        )
    return report["data"].get("sections", {})


def reset_report_store() -> None:
    _report_store.clear()
