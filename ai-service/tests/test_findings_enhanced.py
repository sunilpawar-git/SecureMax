"""Tests for enhanced findings — AI-augmented recommendations + physical verification flags."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from gemini_client import GeminiClient, GeminiError
from report.findings import generate_findings
from report.narrative import enhance_findings_with_ai


def _mock_gemini(response: str = "AI recommendation.") -> MagicMock:
    mock = MagicMock(spec=GeminiClient)
    mock.generate = AsyncMock(return_value=response)
    return mock


def _sample_events() -> list[dict]:
    return [
        {
            "domain": "CPP-01",
            "question_text": "Is the gate locked?",
            "answer": "No",
            "score_drop_trigger": True,
        },
        {
            "domain": "CPP-05",
            "question_text": "Is data encrypted?",
            "answer": "Never",
            "score_drop_trigger": False,
        },
    ]


class TestEnhanceFindingsWithAI:
    @pytest.mark.asyncio
    async def test_enhanced_findings_have_non_placeholder_recommendations(self) -> None:
        gemini = _mock_gemini("Install biometric access at all entry points.")
        findings = generate_findings(_sample_events())
        enhanced = await enhance_findings_with_ai(findings, "hni", gemini=gemini)
        for f in enhanced:
            assert f["recommendation"] != "Placeholder."
            assert len(f["recommendation"]) > 0

    @pytest.mark.asyncio
    async def test_enhanced_findings_preserve_severity(self) -> None:
        gemini = _mock_gemini("Fix this issue.")
        findings = generate_findings(_sample_events())
        original_severities = [f["severity"] for f in findings]
        enhanced = await enhance_findings_with_ai(findings, "hni", gemini=gemini)
        enhanced_severities = [f["severity"] for f in enhanced]
        assert original_severities == enhanced_severities

    @pytest.mark.asyncio
    async def test_enhanced_findings_have_physical_verification_flag(self) -> None:
        gemini = _mock_gemini("Recommendation for physical check.")
        findings = generate_findings(_sample_events())
        enhanced = await enhance_findings_with_ai(findings, "hni", gemini=gemini)
        for f in enhanced:
            assert "requires_physical_verification" in f

    @pytest.mark.asyncio
    async def test_physical_verification_true_for_physical_domains(self) -> None:
        gemini = _mock_gemini("Verify on-site.")
        events = [
            {
                "domain": "CPP-01",
                "question_text": "Perimeter secure?",
                "answer": "No",
                "score_drop_trigger": True,
            },
        ]
        findings = generate_findings(events)
        enhanced = await enhance_findings_with_ai(findings, "hni", gemini=gemini)
        assert enhanced[0]["requires_physical_verification"] is True

    @pytest.mark.asyncio
    async def test_falls_back_to_rule_based_on_gemini_failure(self) -> None:
        gemini = MagicMock(spec=GeminiClient)
        gemini.generate = AsyncMock(side_effect=GeminiError("API down"))
        findings = generate_findings(_sample_events())
        enhanced = await enhance_findings_with_ai(findings, "hni", gemini=gemini)
        for f in enhanced:
            assert len(f["recommendation"]) > 0
            assert "CPP-" in f["recommendation"]

    @pytest.mark.asyncio
    async def test_does_not_modify_original_findings(self) -> None:
        gemini = _mock_gemini("New recommendation.")
        findings = generate_findings(_sample_events())
        originals = [dict(f) for f in findings]
        await enhance_findings_with_ai(findings, "hni", gemini=gemini)
        assert findings == originals

    @pytest.mark.asyncio
    async def test_empty_findings_returns_empty(self) -> None:
        gemini = _mock_gemini("Unused.")
        enhanced = await enhance_findings_with_ai([], "hni", gemini=gemini)
        assert enhanced == []
