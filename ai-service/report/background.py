"""
Background report generation task — extracted from report router for file size.
Runs as a FastAPI BackgroundTask: generates report data, renders PDF, encrypts, stores.
"""

import json
import logging

import asyncpg

import report_repository as rpt_repo
import session_repository as repo
from config import get_settings
from crypto import decrypt, derive_key, encrypt_bytes
from gemini_client import GeminiClient
from questionnaire import get_node_map
from report.constants import (
    REPORT_JOB_COMPLETED,
    REPORT_JOB_FAILED,
    REPORT_JOB_PROCESSING,
)
from report.generator import generate_report_data
from report.renderer import render_pdf
from report.schemas import ReportData

logger = logging.getLogger(__name__)
_settings = get_settings()
_enc_key = derive_key(_settings.encryption_key) if _settings.encryption_key else None

ERR_ENCRYPTION_NOT_CONFIGURED = "Encryption key not configured — cannot store report"


def build_gemini() -> GeminiClient | None:
    """Create a GeminiClient if the API key is configured."""
    if _settings.gemini_api_key:
        try:
            return GeminiClient(_settings)
        except ValueError:
            return None
    return None


def build_report_events(raw_events: list[dict], node_map: dict) -> list[dict]:
    """Decrypt event answers and build the dict format expected by generator."""
    if not _enc_key:
        raise RuntimeError(ERR_ENCRYPTION_NOT_CONFIGURED)
    result = []
    for ev in raw_events:
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


async def render_pdf_safe(report_data: ReportData) -> bytes | None:
    """Render PDF via Playwright. Returns None on failure — caller stores NULL."""
    try:
        return await render_pdf(report_data)
    except Exception:
        logger.warning(
            "PDF rendering failed for session %s", report_data.session_id[:8]
        )
        return None


async def generate_report_background(
    pool: asyncpg.Pool,
    job_id: str,
    session_id: str,
    session_data: dict,
    events: list[dict],
    *,
    versioned: bool = False,
) -> None:
    """Background task: generate report data, render PDF, encrypt, store."""
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

            gemini = build_gemini()
            report_data = await generate_report_data(
                session_for_report,
                gemini=gemini,
                conn=conn,
                settings=_settings,
            )

            pdf_bytes = await render_pdf_safe(report_data)
            pdf_enc = encrypt_bytes(pdf_bytes, _enc_key) if pdf_bytes else None

            if versioned:
                await rpt_repo.archive_and_create_versioned_artifact(
                    conn,
                    session_id,
                    pdf_encrypted=pdf_enc,
                    urgency_score=report_data.urgency_score,
                    peer_benchmark_percentile=report_data.peer_benchmark_percentile,
                    findings_json=report_data.model_dump(mode="json"),
                    compliance_gap_count=report_data.compliance_gap_count,
                )
            else:
                await rpt_repo.store_artifact(
                    conn,
                    session_id,
                    pdf_encrypted=pdf_enc,
                    urgency_score=report_data.urgency_score,
                    peer_benchmark_percentile=report_data.peer_benchmark_percentile,
                    findings_json=report_data.model_dump(mode="json"),
                    compliance_gap_count=report_data.compliance_gap_count,
                )
            await rpt_repo.update_job_status(conn, job_id, REPORT_JOB_COMPLETED)

        except Exception:
            logger.exception(
                "Background report generation failed for session %s",
                session_id[:8],
            )
            await rpt_repo.update_job_status(
                conn, job_id, REPORT_JOB_FAILED, error_message="Generation failed"
            )
