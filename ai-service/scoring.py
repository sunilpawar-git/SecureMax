"""
Radar score calculation engine.
Pure functions — computes CPP domain scores based on answers.
"""

from answer_keywords import MODERATE_KEYWORDS, NEGATIVE_KEYWORDS
from config import CPP_DOMAINS

SCORE_INITIAL = 100.0
PENALTY_CRITICAL = 20.0
PENALTY_HIGH = 15.0
PENALTY_MODERATE = 10.0
PENALTY_MINOR = 5.0


def calculate_answer_penalty(
    answer: str | list[str],
    is_score_drop_trigger: bool,
) -> float:
    """Determine the penalty for a given answer."""
    answers = [answer] if isinstance(answer, str) else answer
    max_penalty = 0.0

    for ans in answers:
        ans_lower = ans.lower().strip()
        if ans_lower in NEGATIVE_KEYWORDS:
            penalty = PENALTY_CRITICAL if is_score_drop_trigger else PENALTY_HIGH
        elif ans_lower in MODERATE_KEYWORDS:
            penalty = PENALTY_MODERATE if is_score_drop_trigger else PENALTY_MINOR
        else:
            penalty = 0.0
        max_penalty = max(max_penalty, penalty)

    return max_penalty


def compute_radar_scores(
    events: list[dict],
) -> dict[str, float]:
    """Compute radar scores from a list of session events."""
    scores = dict.fromkeys(CPP_DOMAINS, SCORE_INITIAL)

    for event in events:
        domain = event.get("domain", "")
        answer = event.get("answer", "")
        is_trigger = event.get("score_drop_trigger", False)

        if domain not in scores:
            continue

        penalty = calculate_answer_penalty(answer, is_trigger)
        scores[domain] = max(0.0, scores[domain] - penalty)

    return scores
