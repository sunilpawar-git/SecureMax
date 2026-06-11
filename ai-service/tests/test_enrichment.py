"""Phase 2C tests — Pass 2 Analyze & Enrich module."""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from newsletter.enrichment import _fallback_enrich, enrich_themes
from newsletter.models import EnrichedTheme, ThemeCluster


def _make_cluster(ids: list[str] | None = None) -> ThemeCluster:
    return ThemeCluster(
        theme_title="Perimeter Breaches",
        theme_summary="Multiple perimeter fence breaches in Mumbai",
        article_ids=ids or ["a1", "a2"],
        primary_domain="CPP-01",
        secondary_domains=["CPP-07"],
    )


def _make_articles() -> list[dict]:
    return [
        {"id": "a1", "title": "Fence cut at warehouse", "summary": "Breach at Mumbai site"},
        {"id": "a2", "title": "CCTV bypass reported", "summary": "Surveillance evaded"},
    ]


class TestEnrichThemes:
    @pytest.mark.asyncio
    async def test_parses_valid_gemini_response(self) -> None:
        gemini_response = json.dumps({
            "situation": "Two perimeter breaches occurred in Mumbai.",
            "assessment": "Physical barriers are inadequate.",
            "implications": "Wider exposure for warehouse operators.",
            "recommendation": "Install vibration sensors on perimeter fencing.",
            "cpp_citation": "CPP-01 mandates concentric ring defence.",
            "segment_impact": {
                "hni": "Gated communities at risk",
                "enterprise": "Corporate campuses need review",
                "critical_infrastructure": "Limited direct impact",
            },
        })
        gemini = MagicMock()
        gemini.generate = AsyncMock(return_value=gemini_response)

        result = await enrich_themes(
            [_make_cluster()], _make_articles(), gemini=gemini
        )

        assert len(result) == 1
        assert isinstance(result[0], EnrichedTheme)
        assert result[0].situation == "Two perimeter breaches occurred in Mumbai."
        assert result[0].cpp_domain == "CPP-01"
        assert result[0].segment_impact.hni == "Gated communities at risk"

    @pytest.mark.asyncio
    async def test_with_cpp_retrieval(self) -> None:
        gemini_response = json.dumps({
            "situation": "Sit",
            "assessment": "Assess",
            "implications": "Impl",
            "recommendation": "Rec",
            "cpp_citation": "CPP-01 §3.2",
        })
        gemini = MagicMock()
        gemini.generate = AsyncMock(return_value=gemini_response)

        chunk = MagicMock()
        chunk.domain = "CPP-01"
        chunk.section = "Physical Security Principles"
        chunk.chunk_text = "The 4D model: Deter, Detect, Delay, Deny."
        cpp_retrieve = AsyncMock(return_value=[chunk])

        result = await enrich_themes(
            [_make_cluster()], _make_articles(),
            gemini=gemini, cpp_retrieve=cpp_retrieve,
        )

        assert len(result) == 1
        cpp_retrieve.assert_called_once()
        call_kwargs = cpp_retrieve.call_args
        assert "CPP-01" in call_kwargs.kwargs.get("domains", [])

    @pytest.mark.asyncio
    async def test_falls_back_on_gemini_error(self) -> None:
        gemini = MagicMock()
        gemini.generate = AsyncMock(side_effect=RuntimeError("down"))

        result = await enrich_themes(
            [_make_cluster()], _make_articles(), gemini=gemini
        )

        assert len(result) == 1
        assert isinstance(result[0], EnrichedTheme)
        assert "incident" in result[0].situation.lower()

    @pytest.mark.asyncio
    async def test_enriches_multiple_clusters(self) -> None:
        c1 = _make_cluster(["a1"])
        c2 = ThemeCluster(
            theme_title="Crisis Management",
            theme_summary="Emergency response gaps",
            article_ids=["a2"],
            primary_domain="CPP-03",
        )
        gemini = MagicMock()
        gemini.generate = AsyncMock(return_value=json.dumps({
            "situation": "S", "assessment": "A",
            "implications": "I", "recommendation": "R",
        }))

        result = await enrich_themes([c1, c2], _make_articles(), gemini=gemini)
        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_cpp_retrieval_failure_continues(self) -> None:
        """CPP retrieval failure should not block enrichment."""
        gemini_response = json.dumps({
            "situation": "S", "assessment": "A",
            "implications": "I", "recommendation": "R",
        })
        gemini = MagicMock()
        gemini.generate = AsyncMock(return_value=gemini_response)
        cpp_retrieve = AsyncMock(side_effect=RuntimeError("DB down"))

        result = await enrich_themes(
            [_make_cluster()], _make_articles(),
            gemini=gemini, cpp_retrieve=cpp_retrieve,
        )
        assert len(result) == 1


class TestFallbackEnrich:
    def test_produces_valid_enriched_theme(self) -> None:
        cluster = _make_cluster()
        article_map = {a["id"]: a for a in _make_articles()}
        result = _fallback_enrich(cluster, article_map)

        assert isinstance(result, EnrichedTheme)
        assert result.cpp_domain == "CPP-01"
        assert len(result.source_article_ids) == 2
        assert "Fence cut" in result.assessment

    def test_handles_missing_articles(self) -> None:
        cluster = _make_cluster(["missing-id"])
        result = _fallback_enrich(cluster, {})
        assert isinstance(result, EnrichedTheme)
