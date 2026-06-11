"""Phase 6B tests — Historical cross-referencing from threat_intel archive."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest

from newsletter.historical import (
    HistoricalMatch,
    find_related_incidents,
    format_historical_context,
)


def _make_row(
    row_id: str = "hist-1",
    title: str = "Past breach",
    domain_tags: list[str] | None = None,
) -> dict:
    return {
        "id": row_id,
        "title": title,
        "summary": "A past security incident.",
        "domain_tags": domain_tags or ["CPP-01"],
        "scraped_at": datetime(2026, 5, 15, tzinfo=UTC),
    }


class TestFindRelatedIncidents:
    @pytest.mark.asyncio
    async def test_returns_matches_for_domain(self) -> None:
        conn = AsyncMock()
        conn.fetch = AsyncMock(return_value=[_make_row()])

        results = await find_related_incidents(
            conn, domain_tags=["CPP-01"], lookback_days=90
        )

        assert len(results) == 1
        assert isinstance(results[0], HistoricalMatch)
        assert "CPP-01" in results[0].similarity_reason

    @pytest.mark.asyncio
    async def test_returns_empty_for_no_tags(self) -> None:
        conn = AsyncMock()
        results = await find_related_incidents(
            conn, domain_tags=[], lookback_days=90
        )
        assert results == []
        conn.fetch.assert_not_called()

    @pytest.mark.asyncio
    async def test_excludes_specified_ids(self) -> None:
        conn = AsyncMock()
        conn.fetch = AsyncMock(return_value=[])

        await find_related_incidents(
            conn,
            domain_tags=["CPP-01"],
            exclude_ids=["current-1", "current-2"],
        )

        call_args = conn.fetch.call_args[0]
        assert "current-1" in call_args[3]

    @pytest.mark.asyncio
    async def test_respects_limit(self) -> None:
        conn = AsyncMock()
        conn.fetch = AsyncMock(return_value=[_make_row()])

        await find_related_incidents(
            conn, domain_tags=["CPP-01"], limit=3
        )

        call_args = conn.fetch.call_args[0]
        assert call_args[4] == 3

    @pytest.mark.asyncio
    async def test_handles_json_string_tags(self) -> None:
        import json
        row = _make_row()
        row["domain_tags"] = json.dumps(["CPP-01", "CPP-03"])
        conn = AsyncMock()
        conn.fetch = AsyncMock(return_value=[row])

        results = await find_related_incidents(
            conn, domain_tags=["CPP-01"]
        )
        assert len(results) == 1
        assert "CPP-01" in results[0].domain_tags


class TestFormatHistoricalContext:
    def test_formats_matches(self) -> None:
        matches = [
            HistoricalMatch(
                id="h1",
                title="Past fence breach",
                summary="Fence was cut at a warehouse.",
                domain_tags=["CPP-01"],
                scraped_at="2026-05-15T00:00:00+00:00",
                similarity_reason="Shared domains: CPP-01",
            )
        ]
        result = format_historical_context(matches)
        assert "Past fence breach" in result
        assert "2026-05-15" in result
        assert "CPP-01" in result

    def test_empty_matches(self) -> None:
        result = format_historical_context([])
        assert "No similar historical incidents" in result

    def test_multiple_matches(self) -> None:
        matches = [
            HistoricalMatch(
                id=f"h{i}", title=f"Incident {i}", summary=f"Summary {i}",
                domain_tags=[f"CPP-0{i}"],
                scraped_at=f"2026-05-{10+i}T00:00:00+00:00",
                similarity_reason=f"Shared domains: CPP-0{i}",
            )
            for i in range(1, 4)
        ]
        result = format_historical_context(matches)
        assert "3 related incident(s)" in result
