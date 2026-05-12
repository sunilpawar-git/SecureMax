"""Tests for radar score calculation engine."""

from scoring import (
    PENALTY_CRITICAL,
    PENALTY_HIGH,
    PENALTY_MINOR,
    PENALTY_MODERATE,
    SCORE_INITIAL,
    calculate_answer_penalty,
    compute_radar_scores,
)


class TestCalculateAnswerPenalty:
    def test_negative_with_trigger_gives_critical(self) -> None:
        penalty = calculate_answer_penalty("No", is_score_drop_trigger=True)
        assert penalty == PENALTY_CRITICAL

    def test_negative_without_trigger_gives_high(self) -> None:
        penalty = calculate_answer_penalty("Never", is_score_drop_trigger=False)
        assert penalty == PENALTY_HIGH

    def test_moderate_with_trigger_gives_moderate(self) -> None:
        penalty = calculate_answer_penalty("Sometimes", is_score_drop_trigger=True)
        assert penalty == PENALTY_MODERATE

    def test_moderate_without_trigger_gives_minor(self) -> None:
        penalty = calculate_answer_penalty("Partially lit", is_score_drop_trigger=False)
        assert penalty == PENALTY_MINOR

    def test_positive_answer_gives_zero(self) -> None:
        penalty = calculate_answer_penalty("Yes — full coverage", is_score_drop_trigger=True)
        assert penalty == 0.0

    def test_multi_choice_takes_worst(self) -> None:
        penalty = calculate_answer_penalty(
            ["Yes — full coverage", "No", "Sometimes"],
            is_score_drop_trigger=True,
        )
        assert penalty == PENALTY_CRITICAL

    def test_case_insensitive(self) -> None:
        penalty = calculate_answer_penalty("NO", is_score_drop_trigger=False)
        assert penalty == PENALTY_HIGH


class TestComputeRadarScores:
    def test_empty_events_gives_full_scores(self) -> None:
        scores = compute_radar_scores([])
        for domain in scores:
            assert scores[domain] == SCORE_INITIAL

    def test_negative_answer_reduces_domain_score(self) -> None:
        events = [{"domain": "CPP-01", "answer": "No", "score_drop_trigger": True}]
        scores = compute_radar_scores(events)
        assert scores["CPP-01"] < SCORE_INITIAL
        assert scores["CPP-02"] == SCORE_INITIAL

    def test_multiple_penalties_accumulate(self) -> None:
        events = [
            {"domain": "CPP-01", "answer": "No", "score_drop_trigger": True},
            {"domain": "CPP-01", "answer": "Never", "score_drop_trigger": False},
        ]
        scores = compute_radar_scores(events)
        expected = SCORE_INITIAL - PENALTY_CRITICAL - PENALTY_HIGH
        assert scores["CPP-01"] == expected

    def test_score_never_goes_below_zero(self) -> None:
        events = [
            {"domain": "CPP-03", "answer": "No", "score_drop_trigger": True} for _ in range(20)
        ]
        scores = compute_radar_scores(events)
        assert scores["CPP-03"] == 0.0

    def test_invalid_domain_ignored(self) -> None:
        events = [{"domain": "INVALID", "answer": "No", "score_drop_trigger": True}]
        scores = compute_radar_scores(events)
        assert all(s == SCORE_INITIAL for s in scores.values())


class TestKeywordSSoT:
    """Verify both scoring and findings use the shared keyword module."""

    def test_scoring_imports_from_shared_module(self) -> None:
        import scoring
        from answer_keywords import NEGATIVE_KEYWORDS

        for kw in list(NEGATIVE_KEYWORDS)[:5]:
            penalty = scoring.calculate_answer_penalty(kw, is_score_drop_trigger=False)
            assert penalty > 0, f"Expected penalty for '{kw}'"

    def test_findings_imports_from_shared_module(self) -> None:
        from answer_keywords import NEGATIVE_KEYWORDS
        from report.findings import classify_severity

        for kw in list(NEGATIVE_KEYWORDS)[:5]:
            severity = classify_severity(kw, is_trigger=False)
            assert severity in ("high", "critical"), f"'{kw}' should be high/critical"
