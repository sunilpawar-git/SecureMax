"""
Session context utilities — shared by prompts and questionnaire modules.
Placed in its own module to avoid circular imports between questionnaire ↔ prompts.
"""

_Q_TEXT_MAX = 80
_MAX_CONTEXT_EVENTS = 5


def build_context_summary(events: list[dict], max_events: int = _MAX_CONTEXT_EVENTS) -> str:
    """Build a concise context summary from recent session events for AI branching.

    Expects events with ``question_text`` and ``answer`` keys (plaintext).
    Question text is capped at _Q_TEXT_MAX characters to stay within token budgets.
    """
    recent = events[-max_events:] if len(events) > max_events else events
    lines: list[str] = []
    for event in recent:
        q = event.get("question_text", "")[:_Q_TEXT_MAX]
        a = str(event.get("answer", ""))
        lines.append(f"Q: {q}\nA: {a}")
    return "\n---\n".join(lines)
