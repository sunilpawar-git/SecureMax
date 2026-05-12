"""
Session store for questionnaire state.
In-memory implementation for testing; production uses DB via asyncpg.
"""

import uuid
from typing import Any

from scoring import compute_radar_scores


class SessionStore:
    """In-memory session store. Thread-safe for single-process test usage."""

    def __init__(self) -> None:
        self._sessions: dict[str, dict[str, Any]] = {}

    def create_session(self, user_id: str, track: str) -> str:
        session_id = str(uuid.uuid4())
        self._sessions[session_id] = {
            "session_id": session_id,
            "user_id": user_id,
            "track": track,
            "status": "active",
            "current_node_id": None,
            "events": [],
        }
        return session_id

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        return self._sessions.get(session_id)

    def get_active_session(self, user_id: str) -> dict[str, Any] | None:
        for session in self._sessions.values():
            if session["user_id"] == user_id and session["status"] == "active":
                return session
        return None

    def set_current_node(self, session_id: str, node_id: str) -> None:
        session = self._sessions.get(session_id)
        if session:
            session["current_node_id"] = node_id

    def record_event(
        self,
        session_id: str,
        question_id: str,
        question_text: str,
        answer: str | list[str],
        domain: str,
        score_drop_trigger: bool = False,
    ) -> None:
        session = self._sessions.get(session_id)
        if not session:
            return
        session["events"].append(
            {
                "question_id": question_id,
                "question_text": question_text,
                "answer": answer,
                "domain": domain,
                "score_drop_trigger": score_drop_trigger,
            }
        )

    def get_radar_scores(self, session_id: str) -> dict[str, float]:
        session = self._sessions.get(session_id)
        if not session:
            return {}
        return compute_radar_scores(session["events"])

    def complete_session(self, session_id: str) -> None:
        session = self._sessions.get(session_id)
        if session:
            session["status"] = "completed"

    def abandon_session(self, session_id: str) -> None:
        session = self._sessions.get(session_id)
        if session:
            session["status"] = "abandoned"

    def reset(self) -> None:
        self._sessions.clear()
