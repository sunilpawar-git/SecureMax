"""Phase 2D tests — Pass 3 Compose & Voice module."""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from newsletter.composer import compose_newsletter, fallback_compose
from newsletter.constants import BRAND_SIGN_OFF
from newsletter.models import EnrichedTheme, NewsletterContent, SegmentImpact


def _make_themes(n: int = 2) -> list[EnrichedTheme]:
    return [
        EnrichedTheme(
            theme_title=f"Theme {i}",
            situation=f"Situation {i}",
            assessment=f"Assessment {i}",
            implications=f"Implications {i}",
            recommendation=f"Recommendation {i}",
            cpp_domain=f"CPP-0{i}",
            cpp_citation=f"CPP-0{i} §3.{i}",
            segment_impact=SegmentImpact(
                hni=f"HNI impact {i}",
                enterprise=f"Enterprise impact {i}",
                critical_infrastructure=f"CI impact {i}",
            ),
            source_article_ids=[f"a{i}"],
        )
        for i in range(1, n + 1)
    ]


class TestComposeNewsletter:
    @pytest.mark.asyncio
    async def test_parses_valid_gemini_response(self) -> None:
        themes = _make_themes()
        gemini_response = json.dumps(
            {
                "title": "Weekly Security Intelligence Digest",
                "executive_summary": "Executive summary text.",
                "intelligence_briefing": "Full briefing content here.",
                "full_analysis": "Deep analysis with all themes.",
                "commanders_note": "From the commander's desk...",
                "cta_soft": "Assess your security posture today.",
            }
        )
        gemini = MagicMock()
        gemini.generate = AsyncMock(return_value=gemini_response)

        result = await compose_newsletter(themes, gemini=gemini)

        assert isinstance(result, NewsletterContent)
        assert result.title == "Weekly Security Intelligence Digest"
        assert result.executive_summary == "Executive summary text."
        assert result.intelligence_briefing == "Full briefing content here."
        assert result.full_analysis == "Deep analysis with all themes."
        assert result.commanders_note == "From the commander's desk..."
        assert len(result.themes) == 2

    @pytest.mark.asyncio
    async def test_preserves_full_title(self) -> None:
        """Title is stored verbatim; CSS line-clamp handles visual overflow."""
        gemini = MagicMock()
        gemini.generate = AsyncMock(
            return_value=json.dumps(
                {
                    "title": "A" * 120,
                    "executive_summary": "E",
                    "intelligence_briefing": "B",
                    "full_analysis": "F",
                }
            )
        )

        result = await compose_newsletter(_make_themes(1), gemini=gemini)
        assert result.title == "A" * 120

    @pytest.mark.asyncio
    async def test_falls_back_on_error(self) -> None:
        gemini = MagicMock()
        gemini.generate = AsyncMock(side_effect=RuntimeError("fail"))

        result = await compose_newsletter(_make_themes(), gemini=gemini)
        assert isinstance(result, NewsletterContent)
        assert "Weekly Security Intelligence" in result.title
        assert len(result.themes) == 2

    @pytest.mark.asyncio
    async def test_sets_issue_date(self) -> None:
        gemini = MagicMock()
        gemini.generate = AsyncMock(
            return_value=json.dumps(
                {
                    "title": "T",
                    "executive_summary": "E",
                    "intelligence_briefing": "B",
                    "full_analysis": "F",
                }
            )
        )

        result = await compose_newsletter(_make_themes(1), gemini=gemini)
        assert result.issue_date != ""

    @pytest.mark.asyncio
    async def test_cta_audit_link_set(self) -> None:
        gemini = MagicMock()
        gemini.generate = AsyncMock(
            return_value=json.dumps(
                {
                    "title": "T",
                    "executive_summary": "E",
                    "intelligence_briefing": "B",
                    "full_analysis": "F",
                }
            )
        )

        result = await compose_newsletter(_make_themes(1), gemini=gemini)
        assert result.cta_audit_link == "/security-audit"


class TestFallbackCompose:
    def test_produces_valid_content(self) -> None:
        themes = _make_themes(3)
        result = fallback_compose(themes)

        assert isinstance(result, NewsletterContent)
        assert "3" in result.executive_summary
        assert len(result.themes) == 3

    def test_executive_summary_contains_brand(self) -> None:
        result = fallback_compose(_make_themes())
        assert BRAND_SIGN_OFF in result.executive_summary

    def test_briefing_contains_all_themes(self) -> None:
        themes = _make_themes(3)
        result = fallback_compose(themes)
        for t in themes:
            assert t.theme_title in result.intelligence_briefing

    def test_analysis_contains_segment_impact(self) -> None:
        themes = _make_themes(1)
        result = fallback_compose(themes)
        assert "HNI impact 1" in result.full_analysis
        assert "Enterprise impact 1" in result.full_analysis

    def test_analysis_contains_cpp_citation(self) -> None:
        themes = _make_themes(1)
        result = fallback_compose(themes)
        assert "CPP-01" in result.full_analysis
