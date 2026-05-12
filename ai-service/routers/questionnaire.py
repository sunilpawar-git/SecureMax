"""
Questionnaire API router.
Endpoints: start session, submit answer, resume session, get radar scores.
"""

from fastapi import APIRouter, Header, HTTPException

from models import (
    ResumeSessionRequest,
    ResumeSessionResponse,
    StartSessionRequest,
    StartSessionResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)
from questionnaire import (
    determine_next_node,
    get_entry_node_id,
    get_node_map,
    node_to_response,
)
from session_store import SessionStore

router = APIRouter(prefix="/questionnaire", tags=["questionnaire"])
store = SessionStore()


def _verify_ownership(session: dict, user_id: str | None) -> None:
    """Raises 403 if user_id doesn't match session owner."""
    if user_id and session["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")


@router.post("/start", response_model=StartSessionResponse)
async def start_session(req: StartSessionRequest) -> StartSessionResponse:
    active = store.get_active_session(req.user_id)
    if active:
        raise HTTPException(
            status_code=409,
            detail="Active session already exists. Resume or abandon it first.",
        )

    entry_id = get_entry_node_id(req.track)
    node_map = get_node_map(req.track)
    entry_node = node_map[entry_id]

    session_id = store.create_session(req.user_id, req.track)
    store.set_current_node(session_id, entry_id)

    return StartSessionResponse(
        session_id=session_id,
        first_question=node_to_response(entry_node),
        radar_scores=store.get_radar_scores(session_id),
    )


@router.post("/answer", response_model=SubmitAnswerResponse)
async def submit_answer(
    req: SubmitAnswerRequest,
    x_user_id: str | None = Header(None),
) -> SubmitAnswerResponse:
    session = store.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    _verify_ownership(session, x_user_id)
    if session["status"] == "completed":
        raise HTTPException(status_code=400, detail="Session already completed")

    track = session["track"]
    node_map = get_node_map(track)
    current_id = session["current_node_id"]

    if current_id != req.question_id:
        raise HTTPException(
            status_code=400,
            detail=f"Expected answer for {current_id}, got {req.question_id}",
        )

    current_node = node_map.get(current_id)
    if not current_node:
        raise HTTPException(status_code=500, detail="Current node not in graph")

    store.record_event(
        session_id=req.session_id,
        question_id=req.question_id,
        question_text=current_node["text"],
        answer=req.answer,
        domain=current_node["domain"],
        score_drop_trigger=current_node.get("score_drop_trigger", False),
    )

    next_id = determine_next_node(current_node, req.answer, node_map)

    if not next_id:
        store.complete_session(req.session_id)
        return SubmitAnswerResponse(
            next_question=None,
            radar_scores=store.get_radar_scores(req.session_id),
            is_complete=True,
        )

    next_node = node_map.get(next_id)
    if not next_node:
        store.complete_session(req.session_id)
        return SubmitAnswerResponse(
            next_question=None,
            radar_scores=store.get_radar_scores(req.session_id),
            is_complete=True,
        )

    if next_node.get("is_terminal"):
        store.set_current_node(req.session_id, next_id)
        store.complete_session(req.session_id)
        return SubmitAnswerResponse(
            next_question=node_to_response(next_node),
            radar_scores=store.get_radar_scores(req.session_id),
            is_complete=True,
        )

    store.set_current_node(req.session_id, next_id)
    return SubmitAnswerResponse(
        next_question=node_to_response(next_node),
        radar_scores=store.get_radar_scores(req.session_id),
        is_complete=False,
    )


@router.post("/resume", response_model=ResumeSessionResponse)
async def resume_session(
    req: ResumeSessionRequest,
    x_user_id: str | None = Header(None),
) -> ResumeSessionResponse:
    session = store.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    _verify_ownership(session, x_user_id)
    if session["status"] == "completed":
        raise HTTPException(status_code=400, detail="Session already completed")
    if session["status"] == "abandoned":
        raise HTTPException(status_code=400, detail="Session was abandoned")

    track = session["track"]
    node_map = get_node_map(track)
    current_id = session["current_node_id"]
    current_node = node_map.get(current_id)

    if not current_node:
        raise HTTPException(status_code=500, detail="Current node not in graph")

    return ResumeSessionResponse(
        session_id=req.session_id,
        current_question=node_to_response(current_node),
        radar_scores=store.get_radar_scores(req.session_id),
        questions_answered=len(session["events"]),
    )


@router.post("/{session_id}/abandon")
async def abandon_session(
    session_id: str,
    x_user_id: str | None = Header(None),
) -> dict:
    session = store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    _verify_ownership(session, x_user_id)
    store.abandon_session(session_id)
    return {"status": "abandoned", "session_id": session_id}
