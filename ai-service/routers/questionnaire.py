"""
Questionnaire API router.
Endpoints: start session, submit answer, resume session, abandon session.
"""

import json
import logging

import asyncpg
from fastapi import APIRouter, Depends, Header, HTTPException, status

import session_repository as repo
from branching import determine_next_node_with_ai
from config import Settings, get_settings
from constants import (
    ERR_ACCESS_DENIED,
    ERR_NODE_NOT_IN_GRAPH,
    ERR_SESSION_ABANDONED,
    ERR_SESSION_ALREADY_COMPLETED,
    ERR_SESSION_ALREADY_EXISTS,
    ERR_SESSION_NOT_FOUND,
    ERR_USER_NOT_FOUND,
    ERR_WRONG_QUESTION,
    SESSION_ABANDONED,
    SESSION_COMPLETED,
)
from cpp_repository import get_relevant_chunks
from crypto import decrypt, derive_key, encrypt
from db import get_db
from models import (
    ResumeSessionRequest,
    ResumeSessionResponse,
    StartSessionRequest,
    StartSessionResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)
from questionnaire import get_entry_node_id, get_graph_version, get_node_map, node_to_response

router = APIRouter(prefix="/questionnaire", tags=["questionnaire"])
logger = logging.getLogger(__name__)

_settings = get_settings()
_enc_key = derive_key(_settings.encryption_key) if _settings.encryption_key else None


def _require_enc_key() -> bytes:
    if _enc_key is None:
        raise HTTPException(status_code=500, detail="Encryption key not configured")
    return _enc_key


def _check_ownership(session: dict, user_id: str | None) -> None:
    """Require user_id to be present and match the session owner."""
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=ERR_ACCESS_DENIED)
    if session["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERR_ACCESS_DENIED)


@router.post("/start", response_model=StartSessionResponse)
async def start_session(
    req: StartSessionRequest,
    x_user_id: str | None = Header(None),
    conn: asyncpg.Connection = Depends(get_db),  # noqa: B008
) -> StartSessionResponse:
    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=ERR_ACCESS_DENIED)
    if req.user_id != x_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ERR_ACCESS_DENIED)
    active = await repo.get_active_session(conn, req.user_id)
    if active:
        if _settings.dev_bypass_session_check:
            logging.warning(
                "DEV_BYPASS_SESSION_CHECK is enabled — abandoning existing session %s "
                "to allow a fresh start. Disable in production.",
                active["id"],
            )
            await repo.abandon_session(conn, active["id"])
        else:
            raise HTTPException(
                status_code=409,
                detail={"message": ERR_SESSION_ALREADY_EXISTS, "session_id": str(active["id"])},
            )

    entry_id = get_entry_node_id(req.track)
    node_map = get_node_map(req.track)
    graph_version = get_graph_version(req.track)

    try:
        session_id = await repo.create_session(conn, req.user_id, req.track, graph_version)
    except asyncpg.ForeignKeyViolationError as exc:
        if "user_id" in str(exc):
            logger.error(
                "User not found starting session (check DATABASE_URL): user=%s",
                req.user_id[:12],
            )
            raise HTTPException(status_code=404, detail=ERR_USER_NOT_FOUND) from exc
        raise

    await repo.set_current_node(conn, session_id, entry_id)

    return StartSessionResponse(
        session_id=session_id,
        first_question=node_to_response(node_map[entry_id]),
        radar_scores=await repo.get_radar_scores(conn, session_id, _require_enc_key()),
    )


@router.post("/answer", response_model=SubmitAnswerResponse)
async def submit_answer(
    req: SubmitAnswerRequest,
    x_user_id: str | None = Header(None),
    conn: asyncpg.Connection = Depends(get_db),  # noqa: B008
) -> SubmitAnswerResponse:
    session = await _load_active_session(conn, req.session_id, x_user_id)
    node_map = get_node_map(session["track"])
    current_node = _validate_question(node_map, session["current_node_id"], req.question_id)

    enc_key = _require_enc_key()
    answer_str = req.answer if isinstance(req.answer, str) else json.dumps(req.answer)
    domain = current_node["domain"]
    score_drop = current_node.get("score_drop_trigger", False)

    chunks, citations = await _safe_retrieve_cpp(answer_str, conn, _settings)

    # Build AI context from events already in the DB (prior to this answer)
    raw_prior = await repo.get_events(conn, req.session_id)
    context_events = _decrypt_context_events(raw_prior, node_map, enc_key)

    # Run AI branching *before* persisting so reasoning is recorded on insert
    branch = await determine_next_node_with_ai(
        current_node,
        req.answer,
        node_map,
        context_events,
        chunks,
        _settings,
        req.session_id,
    )

    # Persist current answer + AI reasoning in a single immutable event row
    await repo.record_event(
        conn,
        session_id=req.session_id,
        question_id=req.question_id,
        answer_encrypted=encrypt(answer_str, enc_key),
        domain=domain,
        ai_reasoning_encrypted=(
            encrypt(branch.reasoning, enc_key) if branch.reasoning and branch.ai_used else None
        ),
        cpp_citations=citations,
        domain_score_delta={"domain": domain, "score_drop_trigger": score_drop},
    )

    return await _build_answer_response(
        conn,
        req.session_id,
        branch,
        node_map,
        enc_key,
        citations,
    )


@router.post("/resume", response_model=ResumeSessionResponse)
async def resume_session(
    req: ResumeSessionRequest,
    x_user_id: str | None = Header(None),
    conn: asyncpg.Connection = Depends(get_db),  # noqa: B008
) -> ResumeSessionResponse:
    session = await repo.get_session(conn, req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail=ERR_SESSION_NOT_FOUND)
    _check_ownership(session, x_user_id)
    if session["status"] == SESSION_COMPLETED:
        raise HTTPException(status_code=400, detail=ERR_SESSION_ALREADY_COMPLETED)
    if session["status"] == SESSION_ABANDONED:
        raise HTTPException(status_code=400, detail=ERR_SESSION_ABANDONED)

    node_map = get_node_map(session["track"])
    current_node = node_map.get(session["current_node_id"])
    if not current_node:
        raise HTTPException(status_code=500, detail=ERR_NODE_NOT_IN_GRAPH)

    events = await repo.get_events(conn, req.session_id)
    return ResumeSessionResponse(
        session_id=req.session_id,
        current_question=node_to_response(current_node),
        radar_scores=await repo.get_radar_scores(conn, req.session_id, _require_enc_key()),
        questions_answered=len(events),
    )


@router.post("/{session_id}/abandon")
async def abandon_session(
    session_id: str,
    x_user_id: str | None = Header(None),
    conn: asyncpg.Connection = Depends(get_db),  # noqa: B008
) -> dict:
    session = await repo.get_session(conn, session_id)
    if not session:
        raise HTTPException(status_code=404, detail=ERR_SESSION_NOT_FOUND)
    _check_ownership(session, x_user_id)
    await repo.abandon_session(conn, session_id)
    return {"status": SESSION_ABANDONED, "session_id": session_id}


# --- Private helpers ---


async def _load_active_session(
    conn: asyncpg.Connection,
    session_id: str,
    user_id: str | None,
) -> dict:
    session = await repo.get_session(conn, session_id)
    if not session:
        raise HTTPException(status_code=404, detail=ERR_SESSION_NOT_FOUND)
    _check_ownership(session, user_id)
    if session["status"] == SESSION_COMPLETED:
        raise HTTPException(status_code=400, detail=ERR_SESSION_ALREADY_COMPLETED)
    return session


def _validate_question(node_map: dict, current_id: str, question_id: str) -> dict:
    if current_id != question_id:
        raise HTTPException(
            status_code=400,
            detail=ERR_WRONG_QUESTION.format(expected=current_id, got=question_id),
        )
    node = node_map.get(current_id)
    if not node:
        raise HTTPException(status_code=500, detail=ERR_NODE_NOT_IN_GRAPH)
    return node


def _decrypt_context_events(
    raw_events: list[dict],
    node_map: dict,
    enc_key: bytes,
) -> list[dict]:
    """Build a human-readable event list for AI context: decrypt answers + resolve question text."""
    result = []
    for ev in raw_events:
        try:
            answer = decrypt(ev["answer_encrypted"], enc_key)
        except (ValueError, Exception):
            answer = ""
        node = node_map.get(ev["question_node_id"], {})
        result.append(
            {
                "question_text": node.get("text", ev["question_node_id"]),
                "answer": answer,
            }
        )
    return result


async def _safe_retrieve_cpp(
    answer_text: str,
    conn: asyncpg.Connection,
    settings: Settings,
) -> tuple[list, list[str]]:
    try:
        chunks = await get_relevant_chunks(answer_text, conn, settings)
        citations = [f"{c.domain}: {c.section}" for c in chunks]
        return chunks, citations
    except Exception:
        logger.warning("CPP retrieval failed", exc_info=True)
        return [], []


async def _build_answer_response(
    conn: asyncpg.Connection,
    session_id: str,
    branch,
    node_map: dict,
    enc_key: bytes,
    citations: list[str],
) -> SubmitAnswerResponse:
    next_id = branch.target_id
    base = {
        "cpp_citations": citations,
        "ai_branched": branch.ai_used,
        "ai_reasoning": branch.reasoning if branch.ai_used else None,
    }

    if next_id and next_id not in node_map:
        logger.error(
            "Branch target '%s' not found in node_map for session %s — "
            "possible graph inconsistency or AI hallucination",
            next_id,
            session_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Internal error: branch target not found in questionnaire graph",
        )

    if not next_id:
        await repo.complete_session(conn, session_id)
        return SubmitAnswerResponse(
            next_question=None,
            radar_scores=await repo.get_radar_scores(conn, session_id, enc_key),
            is_complete=True,
            **base,
        )

    next_node = node_map[next_id]
    await repo.set_current_node(conn, session_id, next_id)

    if next_node.get("is_terminal"):
        await repo.complete_session(conn, session_id)
        return SubmitAnswerResponse(
            next_question=node_to_response(next_node),
            radar_scores=await repo.get_radar_scores(conn, session_id, enc_key),
            is_complete=True,
            **base,
        )

    return SubmitAnswerResponse(
        next_question=node_to_response(next_node),
        radar_scores=await repo.get_radar_scores(conn, session_id, enc_key),
        is_complete=False,
        **base,
    )
