"""Multi-session trend comparison for quarterly re-audits."""

import logging

import asyncpg

logger = logging.getLogger(__name__)


async def get_user_session_history(
    conn: asyncpg.Connection,
    user_id: str,
    limit: int = 4,
) -> list[dict]:
    """Fetch completed sessions with radar scores for a user, newest first.

    Returns list of dicts with keys: session_id, track, domain_scores, created_at.
    """
    rows = await conn.fetch(
        """
        SELECT id, track, domain_scores, created_at
        FROM audit_sessions
        WHERE user_id = $1 AND status = 'completed' AND domain_scores IS NOT NULL
        ORDER BY created_at DESC
        LIMIT $2
        """,
        user_id,
        limit,
    )
    return [
        {
            "session_id": r["id"],
            "track": r["track"],
            "domain_scores": r["domain_scores"],
            "created_at": r["created_at"],
        }
        for r in rows
    ]


def compute_trend(sessions: list[dict]) -> dict:
    """Compute domain-level score trends across sessions.

    Args:
        sessions: List from get_user_session_history (newest first).

    Returns:
        Dict with:
        - current: dict of domain -> score (latest session)
        - previous: dict of domain -> score (previous session, or None)
        - deltas: dict of domain -> float (positive = improvement)
        - overall_trend: "improving" | "declining" | "stable"
        - session_count: int
    """
    if not sessions:
        return {
            "current": {},
            "previous": None,
            "deltas": {},
            "overall_trend": "stable",
            "session_count": 0,
        }

    current_scores = _parse_scores(sessions[0]["domain_scores"])

    if len(sessions) < 2:
        return {
            "current": current_scores,
            "previous": None,
            "deltas": {},
            "overall_trend": "stable",
            "session_count": 1,
        }

    previous_scores = _parse_scores(sessions[1]["domain_scores"])
    deltas = {}
    for domain in current_scores:
        if domain in previous_scores:
            deltas[domain] = current_scores[domain] - previous_scores[domain]

    avg_delta = sum(deltas.values()) / len(deltas) if deltas else 0
    if avg_delta > 3:
        trend = "improving"
    elif avg_delta < -3:
        trend = "declining"
    else:
        trend = "stable"

    return {
        "current": current_scores,
        "previous": previous_scores,
        "deltas": deltas,
        "overall_trend": trend,
        "session_count": len(sessions),
    }


def format_trend_summary(trend_data: dict) -> str:
    """Human-readable summary of trend data for reports."""
    if trend_data["session_count"] < 2:
        return "This is the first assessment. No prior data available for comparison."

    improving = [d for d, v in trend_data["deltas"].items() if v > 3]
    declining = [d for d, v in trend_data["deltas"].items() if v < -3]

    parts = []
    parts.append(
        f"Compared to your previous assessment ({trend_data['session_count']} total sessions):"
    )

    if improving:
        parts.append(f"  Improved: {', '.join(improving)}")
    if declining:
        parts.append(f"  Declined: {', '.join(declining)}")
    if not improving and not declining:
        parts.append("  All domains remained stable (within ±3 points).")

    return "\n".join(parts)


def _parse_scores(scores) -> dict[str, float]:
    """Normalize JSON domain scores to a clean dict."""
    if isinstance(scores, str):
        import json

        scores = json.loads(scores)
    if not isinstance(scores, dict):
        return {}
    return {k: float(v) for k, v in scores.items() if isinstance(v, (int, float))}
