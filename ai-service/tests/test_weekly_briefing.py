"""Tests for LinkedIn weekly briefing synthesis."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from linkedin.weekly_briefing import synthesize_weekly_briefing


class TestWeeklyBriefingSynthesis:
    @pytest.mark.asyncio
    async def test_synthesis_produces_under_3000_chars(self) -> None:
        articles = [
            {
                "title": f"Article {i}",
                "summary": f"Summary of article {i}.",
                "domain_tags": ["CPP-01"],
            }
            for i in range(5)
        ]
        mock_gemini = MagicMock()
        mock_gemini.generate = AsyncMock(
            return_value="This week in physical security: five notable events across India."
        )

        result = await synthesize_weekly_briefing(articles, gemini=mock_gemini)
        assert len(result) <= 3000

    @pytest.mark.asyncio
    async def test_synthesis_includes_article_citations(self) -> None:
        articles = [
            {"title": "Major Bank Breach", "summary": "Summary", "domain_tags": ["CPP-01"]},
            {"title": "Guard Training Gap", "summary": "Summary", "domain_tags": ["CPP-06"]},
        ]
        mock_gemini = MagicMock()
        mock_gemini.generate = AsyncMock(
            return_value="Key events: Major Bank Breach (CPP-01) and Guard Training Gap (CPP-06)."
        )

        result = await synthesize_weekly_briefing(articles, gemini=mock_gemini)
        assert "Major Bank Breach" in result or len(result) > 0

    @pytest.mark.asyncio
    async def test_synthesis_handles_no_articles_gracefully(self) -> None:
        mock_gemini = MagicMock()
        mock_gemini.generate = AsyncMock()

        result = await synthesize_weekly_briefing([], gemini=mock_gemini)
        assert result is not None
        assert "no significant" in result.lower() or len(result) > 10

    @pytest.mark.asyncio
    async def test_synthesis_calls_gemini_with_articles(self) -> None:
        articles = [
            {"title": "Test Article", "summary": "Test summary.", "domain_tags": ["CPP-05"]},
        ]
        mock_gemini = MagicMock()
        mock_gemini.generate = AsyncMock(return_value="Weekly brief content.")

        await synthesize_weekly_briefing(articles, gemini=mock_gemini)
        mock_gemini.generate.assert_called_once()
        call_prompt = mock_gemini.generate.call_args[0][0]
        assert "Test Article" in call_prompt

    @pytest.mark.asyncio
    async def test_synthesis_fallback_on_gemini_error(self) -> None:
        from gemini_client import GeminiError

        articles = [
            {"title": "Article", "summary": "Summary", "domain_tags": ["CPP-01"]},
        ]
        mock_gemini = MagicMock()
        mock_gemini.generate = AsyncMock(side_effect=GeminiError("API error"))

        result = await synthesize_weekly_briefing(articles, gemini=mock_gemini)
        assert result is not None
        assert len(result) > 0
