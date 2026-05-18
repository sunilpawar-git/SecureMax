"""Tests for report/compliance.py — ISO 27001 + PSARA mapping."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from gemini_client import GeminiClient, GeminiError
from report.compliance import (
    COMPLIANCE_FALLBACK_MAP,
    generate_compliance_appendix,
)
from report.schemas import ComplianceMapping


def _mock_gemini(response: str = "") -> MagicMock:
    mock = MagicMock(spec=GeminiClient)
    mock.generate = AsyncMock(return_value=response)
    return mock


def _sample_findings(domains: list[str] | None = None) -> list[dict]:
    domains = domains or ["CPP-01", "CPP-05"]
    return [
        {
            "domain": d,
            "domain_name": f"Domain {d}",
            "question": f"Is {d} secure?",
            "answer": "No",
            "severity": "critical",
            "recommendation": "Fix it.",
        }
        for d in domains
    ]


class TestHNITrackReturnsEmpty:
    @pytest.mark.asyncio
    async def test_hni_returns_empty_list(self) -> None:
        gemini = _mock_gemini()
        result = await generate_compliance_appendix(_sample_findings(), "hni", gemini=gemini)
        assert result == []
        gemini.generate.assert_not_called()


class TestEnterpriseCompliance:
    @pytest.mark.asyncio
    async def test_produces_one_mapping_per_finding(self) -> None:
        response = (
            '{"iso_clause": "A.11.1.1", '
            '"psara_section": "Section 4", '
            '"remediation_owner_role": "Security Manager"}'
        )
        gemini = _mock_gemini(response)
        findings = _sample_findings(["CPP-01", "CPP-03", "CPP-05"])
        result = await generate_compliance_appendix(findings, "enterprise", gemini=gemini)
        assert len(result) == 3

    @pytest.mark.asyncio
    async def test_each_mapping_has_required_fields(self) -> None:
        response = (
            '{"iso_clause": "A.11.1.2", '
            '"psara_section": "Section 5", '
            '"remediation_owner_role": "CISO"}'
        )
        gemini = _mock_gemini(response)
        result = await generate_compliance_appendix(
            _sample_findings(["CPP-01"]), "enterprise", gemini=gemini
        )
        assert len(result) == 1
        m = result[0]
        assert isinstance(m, ComplianceMapping)
        assert m.iso_clause.startswith("A.")
        assert m.psara_section
        assert m.remediation_owner_role

    @pytest.mark.asyncio
    async def test_gemini_failure_uses_fallback(self) -> None:
        gemini = MagicMock(spec=GeminiClient)
        gemini.generate = AsyncMock(side_effect=GeminiError("down"))
        findings = _sample_findings(["CPP-01", "CPP-07"])
        result = await generate_compliance_appendix(findings, "enterprise", gemini=gemini)
        assert len(result) == 2
        for m in result:
            assert isinstance(m, ComplianceMapping)
            assert m.iso_clause
            assert m.psara_section
            assert m.remediation_owner_role

    @pytest.mark.asyncio
    async def test_malformed_gemini_json_uses_fallback(self) -> None:
        gemini = _mock_gemini("not valid json {{{")
        result = await generate_compliance_appendix(
            _sample_findings(["CPP-02"]), "enterprise", gemini=gemini
        )
        assert len(result) == 1
        m = result[0]
        assert m.finding_domain == "CPP-02"
        assert m.iso_clause  # from fallback

    @pytest.mark.asyncio
    async def test_empty_findings_returns_empty(self) -> None:
        gemini = _mock_gemini()
        result = await generate_compliance_appendix([], "enterprise", gemini=gemini)
        assert result == []


class TestFallbackMap:
    def test_covers_all_seven_cpp_domains(self) -> None:
        expected = {
            "CPP-01",
            "CPP-02",
            "CPP-03",
            "CPP-04",
            "CPP-05",
            "CPP-06",
            "CPP-07",
        }
        assert set(COMPLIANCE_FALLBACK_MAP.keys()) == expected

    def test_each_entry_has_required_keys(self) -> None:
        for domain, entry in COMPLIANCE_FALLBACK_MAP.items():
            assert "iso_clause" in entry, f"{domain} missing iso_clause"
            assert "psara_section" in entry, f"{domain} missing psara_section"
            assert "remediation_owner_role" in entry, f"{domain} missing remediation_owner_role"
