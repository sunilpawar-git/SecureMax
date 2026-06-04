"""Tests for multi-session trend comparison."""

from report.trending import compute_trend, format_trend_summary


class TestComputeTrend:
    def test_empty_sessions(self) -> None:
        result = compute_trend([])
        assert result["session_count"] == 0
        assert result["overall_trend"] == "stable"
        assert result["current"] == {}

    def test_single_session_no_comparison(self) -> None:
        sessions = [
            {"session_id": "s1", "track": "hni",
             "domain_scores": {"CPP-01": 60, "CPP-02": 70},
             "created_at": "2026-01-01"},
        ]
        result = compute_trend(sessions)
        assert result["session_count"] == 1
        assert result["current"] == {"CPP-01": 60.0, "CPP-02": 70.0}
        assert result["previous"] is None
        assert result["deltas"] == {}

    def test_two_sessions_improving(self) -> None:
        sessions = [
            {"session_id": "s2", "track": "hni",
             "domain_scores": {"CPP-01": 80, "CPP-02": 75},
             "created_at": "2026-04-01"},
            {"session_id": "s1", "track": "hni",
             "domain_scores": {"CPP-01": 60, "CPP-02": 65},
             "created_at": "2026-01-01"},
        ]
        result = compute_trend(sessions)
        assert result["session_count"] == 2
        assert result["deltas"]["CPP-01"] == 20.0
        assert result["deltas"]["CPP-02"] == 10.0
        assert result["overall_trend"] == "improving"

    def test_two_sessions_declining(self) -> None:
        sessions = [
            {"session_id": "s2", "track": "hni",
             "domain_scores": {"CPP-01": 40, "CPP-02": 35},
             "created_at": "2026-04-01"},
            {"session_id": "s1", "track": "hni",
             "domain_scores": {"CPP-01": 60, "CPP-02": 65},
             "created_at": "2026-01-01"},
        ]
        result = compute_trend(sessions)
        assert result["overall_trend"] == "declining"
        assert result["deltas"]["CPP-01"] == -20.0

    def test_stable_trend_within_threshold(self) -> None:
        sessions = [
            {"session_id": "s2", "track": "hni",
             "domain_scores": {"CPP-01": 62, "CPP-02": 68},
             "created_at": "2026-04-01"},
            {"session_id": "s1", "track": "hni",
             "domain_scores": {"CPP-01": 60, "CPP-02": 70},
             "created_at": "2026-01-01"},
        ]
        result = compute_trend(sessions)
        assert result["overall_trend"] == "stable"

    def test_handles_json_string_scores(self) -> None:
        import json
        sessions = [
            {"session_id": "s2", "track": "hni",
             "domain_scores": json.dumps({"CPP-01": 80}),
             "created_at": "2026-04-01"},
            {"session_id": "s1", "track": "hni",
             "domain_scores": json.dumps({"CPP-01": 50}),
             "created_at": "2026-01-01"},
        ]
        result = compute_trend(sessions)
        assert result["deltas"]["CPP-01"] == 30.0


class TestFormatTrendSummary:
    def test_first_session_message(self) -> None:
        trend = compute_trend([
            {"session_id": "s1", "track": "hni",
             "domain_scores": {"CPP-01": 60}, "created_at": "2026-01-01"},
        ])
        summary = format_trend_summary(trend)
        assert "first assessment" in summary.lower()

    def test_improvement_listed(self) -> None:
        trend = {
            "current": {"CPP-01": 80},
            "previous": {"CPP-01": 50},
            "deltas": {"CPP-01": 30.0},
            "overall_trend": "improving",
            "session_count": 2,
        }
        summary = format_trend_summary(trend)
        assert "Improved" in summary
        assert "CPP-01" in summary

    def test_decline_listed(self) -> None:
        trend = {
            "current": {"CPP-01": 30},
            "previous": {"CPP-01": 70},
            "deltas": {"CPP-01": -40.0},
            "overall_trend": "declining",
            "session_count": 2,
        }
        summary = format_trend_summary(trend)
        assert "Declined" in summary
