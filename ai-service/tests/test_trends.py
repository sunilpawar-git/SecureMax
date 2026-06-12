"""Phase 6A tests — Trend detection across time windows."""

import json
from unittest.mock import AsyncMock

import pytest

from newsletter.trends import (
    TrendResult,
    _classify_trend,
    _count_domains,
    detect_trends,
    format_trend_summary,
)


class TestClassifyTrend:
    def test_rising_over_20_percent(self) -> None:
        direction, pct = _classify_trend(15, 10)
        assert direction == "rising"
        assert pct == 50.0

    def test_declining_over_20_percent(self) -> None:
        direction, pct = _classify_trend(5, 10)
        assert direction == "declining"
        assert pct == -50.0

    def test_stable_within_threshold(self) -> None:
        direction, pct = _classify_trend(11, 10)
        assert direction == "stable"

    def test_zero_previous_with_current(self) -> None:
        direction, pct = _classify_trend(5, 0)
        assert direction == "rising"
        assert pct == 100.0

    def test_both_zero(self) -> None:
        direction, pct = _classify_trend(0, 0)
        assert direction == "stable"
        assert pct == 0.0

    def test_zero_current_nonzero_previous(self) -> None:
        direction, pct = _classify_trend(0, 5)
        assert direction == "declining"
        assert pct == -100.0


class TestCountDomains:
    def test_counts_json_list(self) -> None:
        rows = [
            {"domain_tags": ["CPP-01", "CPP-03"]},
            {"domain_tags": ["CPP-01"]},
        ]
        counts = _count_domains(rows)
        assert counts["CPP-01"] == 2
        assert counts["CPP-03"] == 1

    def test_counts_json_string(self) -> None:
        rows = [{"domain_tags": json.dumps(["CPP-05"])}]
        counts = _count_domains(rows)
        assert counts["CPP-05"] == 1

    def test_empty_rows(self) -> None:
        assert _count_domains([]) == {}


class TestDetectTrends:
    @pytest.mark.asyncio
    async def test_returns_results_for_all_windows(self) -> None:
        conn = AsyncMock()
        conn.fetch = AsyncMock(
            return_value=[
                {"domain_tags": ["CPP-01"]},
                {"domain_tags": ["CPP-01", "CPP-03"]},
            ]
        )

        results = await detect_trends(conn, windows=(7, 30))
        assert 7 in results
        assert 30 in results
        assert all(isinstance(t, TrendResult) for t in results[7])

    @pytest.mark.asyncio
    async def test_detects_rising_trend(self) -> None:
        current = [
            {"domain_tags": ["CPP-01"]},
            {"domain_tags": ["CPP-01"]},
            {"domain_tags": ["CPP-01"]},
        ]
        prior = [{"domain_tags": ["CPP-01"]}]

        conn = AsyncMock()
        conn.fetch = AsyncMock(side_effect=[current, prior])

        results = await detect_trends(conn, windows=(7,))
        cpp01 = [t for t in results[7] if t.domain == "CPP-01"]
        assert len(cpp01) == 1
        assert cpp01[0].direction == "rising"

    @pytest.mark.asyncio
    async def test_detects_declining_trend(self) -> None:
        current = [{"domain_tags": ["CPP-03"]}]
        prior = [
            {"domain_tags": ["CPP-03"]},
            {"domain_tags": ["CPP-03"]},
            {"domain_tags": ["CPP-03"]},
        ]

        conn = AsyncMock()
        conn.fetch = AsyncMock(side_effect=[current, prior])

        results = await detect_trends(conn, windows=(7,))
        cpp03 = [t for t in results[7] if t.domain == "CPP-03"]
        assert len(cpp03) == 1
        assert cpp03[0].direction == "declining"


class TestFormatTrendSummary:
    def test_formats_rising_trend(self) -> None:
        trends = {
            7: [TrendResult("CPP-01", "rising", 10, 5, 100.0)],
        }
        summary = format_trend_summary(trends)
        assert "CPP-01 rising" in summary
        assert "7-day" in summary

    def test_formats_declining_trend(self) -> None:
        trends = {
            30: [TrendResult("CPP-05", "declining", 2, 8, -75.0)],
        }
        summary = format_trend_summary(trends)
        assert "CPP-05 declining" in summary

    def test_no_trends_detected(self) -> None:
        trends = {
            7: [TrendResult("CPP-01", "stable", 5, 5, 0.0)],
        }
        summary = format_trend_summary(trends)
        assert "No significant trends" in summary

    def test_multiple_windows(self) -> None:
        trends = {
            7: [TrendResult("CPP-01", "rising", 10, 3, 233.0)],
            30: [TrendResult("CPP-03", "declining", 2, 10, -80.0)],
        }
        summary = format_trend_summary(trends)
        assert "7-day" in summary
        assert "30-day" in summary
