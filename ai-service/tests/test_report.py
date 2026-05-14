"""Tests for report findings engine — pure unit tests (no router/DB)."""

from report.findings import (
    classify_severity,
    compute_peer_benchmark,
    compute_urgency_score,
    generate_findings,
    split_free_paid,
)


class TestFindingsEngine:
    def test_generate_findings_from_negative_answers(self) -> None:
        events = [
            {
                "domain": "CPP-01",
                "question_text": "Q1",
                "answer": "No",
                "score_drop_trigger": True,
            },
            {
                "domain": "CPP-05",
                "question_text": "Q2",
                "answer": "Never",
                "score_drop_trigger": False,
            },
        ]
        findings = generate_findings(events)
        assert len(findings) == 2
        assert findings[0]["severity"] == "critical"
        assert findings[1]["severity"] == "high"

    def test_positive_answers_generate_no_findings(self) -> None:
        events = [
            {
                "domain": "CPP-01",
                "question_text": "Q1",
                "answer": "Yes — full coverage",
                "score_drop_trigger": True,
            },
        ]
        findings = generate_findings(events)
        assert len(findings) == 0

    def test_classify_severity_logic(self) -> None:
        assert classify_severity("No", True) == "critical"
        assert classify_severity("No", False) == "high"
        assert classify_severity("Sometimes", True) == "high"
        assert classify_severity("Sometimes", False) == "medium"
        assert classify_severity("Yes — all areas", False) == "low"

    def test_urgency_score_range(self) -> None:
        event = {
            "domain": "CPP-01",
            "question_text": "Q",
            "answer": "No",
            "score_drop_trigger": True,
        }
        events = [event] * 5
        findings = generate_findings(events)
        score = compute_urgency_score(findings)
        assert 0 <= score <= 100

    def test_urgency_score_zero_for_no_findings(self) -> None:
        assert compute_urgency_score([]) == 0

    def test_peer_benchmark_structure(self) -> None:
        benchmark = compute_peer_benchmark(55)
        assert "user_score" in benchmark
        assert "peer_average" in benchmark
        assert "percentile" in benchmark
        assert "interpretation" in benchmark
        assert benchmark["user_score"] == 55

    def test_split_free_paid_blurs_answers(self) -> None:
        findings = [
            {
                "domain": "CPP-01",
                "domain_name": "Physical Security",
                "severity": "critical",
                "question": "Is the gate locked?",
                "answer": "No",
                "recommendation": "Lock the gate.",
            },
        ]
        free, paid = split_free_paid(findings)
        assert free[0]["answer"] == "●●●●●●"
        assert paid[0]["answer"] == "No"
