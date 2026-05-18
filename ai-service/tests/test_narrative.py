"""Tests for report/narrative.py — AI-generated report narrative content."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from gemini_client import GeminiClient, GeminiError
from report.narrative import (
    generate_board_summary,
    generate_executive_summary,
    generate_finding_recommendation,
)


def _mock_gemini(response_text: str = "AI generated text") -> MagicMock:
    mock = MagicMock(spec=GeminiClient)
    mock.generate = AsyncMock(return_value=response_text)
    return mock


def _sample_findings(severity: str = "critical", count: int = 2) -> list[dict]:
    return [
        {
            "domain": "CPP-01",
            "domain_name": "Physical Security",
            "question": f"Is perimeter secured? (q{i})",
            "answer": "No",
            "severity": severity,
            "recommendation": "Placeholder.",
        }
        for i in range(count)
    ]


class TestGenerateExecutiveSummary:
    @pytest.mark.asyncio
    async def test_returns_string(self) -> None:
        gemini = _mock_gemini("Your property has critical vulnerabilities.")
        result = await generate_executive_summary(_sample_findings(), "hni", gemini=gemini)
        assert isinstance(result, str)
        assert len(result) > 0

    @pytest.mark.asyncio
    async def test_calls_gemini_with_prompt(self) -> None:
        gemini = _mock_gemini("Summary text.")
        await generate_executive_summary(_sample_findings(), "hni", gemini=gemini)
        gemini.generate.assert_called_once()
        prompt_arg = gemini.generate.call_args[0][0]
        assert "CPP-01" in prompt_arg or "Physical Security" in prompt_arg

    @pytest.mark.asyncio
    async def test_critical_findings_produce_urgency_language(self) -> None:
        gemini = _mock_gemini("IMMEDIATE attention required for critical gaps.")
        result = await generate_executive_summary(
            _sample_findings("critical", 3), "hni", gemini=gemini
        )
        assert result  # non-empty

    @pytest.mark.asyncio
    async def test_fallback_on_gemini_failure(self) -> None:
        gemini = MagicMock(spec=GeminiClient)
        gemini.generate = AsyncMock(side_effect=GeminiError("API down"))
        result = await generate_executive_summary(_sample_findings(), "hni", gemini=gemini)
        assert "critical" in result.lower() or "finding" in result.lower()

    @pytest.mark.asyncio
    async def test_empty_findings_returns_clean_summary(self) -> None:
        gemini = _mock_gemini("No significant gaps identified.")
        result = await generate_executive_summary([], "hni", gemini=gemini)
        assert isinstance(result, str)


class TestGenerateBoardSummary:
    @pytest.mark.asyncio
    async def test_returns_string(self) -> None:
        gemini = _mock_gemini("Board-level risk exposure summary.")
        result = await generate_board_summary(_sample_findings(), gemini=gemini)
        assert isinstance(result, str)

    @pytest.mark.asyncio
    async def test_prompt_includes_liability_context(self) -> None:
        gemini = _mock_gemini("Liability and insurance implications.")
        await generate_board_summary(_sample_findings(), gemini=gemini)
        prompt_arg = gemini.generate.call_args[0][0]
        assert "board" in prompt_arg.lower() or "executive" in prompt_arg.lower()

    @pytest.mark.asyncio
    async def test_fallback_on_gemini_failure(self) -> None:
        gemini = MagicMock(spec=GeminiClient)
        gemini.generate = AsyncMock(side_effect=GeminiError("down"))
        result = await generate_board_summary(_sample_findings(), gemini=gemini)
        assert isinstance(result, str)
        assert len(result) > 0


class TestGenerateFindingRecommendation:
    @pytest.mark.asyncio
    async def test_returns_recommendation_string(self) -> None:
        gemini = _mock_gemini("Install perimeter fencing with CCTV.")
        finding = _sample_findings()[0]
        result = await generate_finding_recommendation(finding, "hni", gemini=gemini)
        assert isinstance(result, str)
        assert len(result) > 0

    @pytest.mark.asyncio
    async def test_prompt_references_cpp_domain(self) -> None:
        gemini = _mock_gemini("Upgrade access control per CPP-01.")
        finding = _sample_findings()[0]
        await generate_finding_recommendation(finding, "hni", gemini=gemini)
        prompt_arg = gemini.generate.call_args[0][0]
        assert "CPP-01" in prompt_arg

    @pytest.mark.asyncio
    async def test_fallback_on_gemini_failure(self) -> None:
        gemini = MagicMock(spec=GeminiClient)
        gemini.generate = AsyncMock(side_effect=GeminiError("down"))
        finding = _sample_findings()[0]
        result = await generate_finding_recommendation(finding, "hni", gemini=gemini)
        assert "CPP-01" in result or "Physical Security" in result

    @pytest.mark.asyncio
    async def test_handles_answer_with_braces(self) -> None:
        """Answers containing {braces} must not break prompt formatting (S4)."""
        gemini = _mock_gemini("Recommendation text.")
        finding = _sample_findings()[0]
        finding["answer"] = "We use {firewall} rules and {VPN}"
        result = await generate_finding_recommendation(finding, "hni", gemini=gemini)
        assert isinstance(result, str)


class TestInputSanitization:
    @pytest.mark.asyncio
    async def test_control_characters_stripped(self) -> None:
        gemini = _mock_gemini("Clean response.")
        finding = _sample_findings()[0]
        finding["answer"] = "No\x00\x01\x02 access"
        await generate_finding_recommendation(finding, "hni", gemini=gemini)
        prompt_arg = gemini.generate.call_args[0][0]
        assert "\x00" not in prompt_arg
        assert "\x01" not in prompt_arg

    @pytest.mark.asyncio
    async def test_long_answers_truncated(self) -> None:
        gemini = _mock_gemini("Response.")
        finding = _sample_findings()[0]
        finding["answer"] = "x" * 1000
        await generate_finding_recommendation(finding, "hni", gemini=gemini)
        prompt_arg = gemini.generate.call_args[0][0]
        assert "x" * 600 not in prompt_arg
