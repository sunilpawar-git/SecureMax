"""Tests for report Pydantic schemas — validates typed report data structures."""

import pytest
from pydantic import ValidationError

from report.schemas import (
    ComplianceMapping,
    Finding,
    FreeSummary,
    ReportData,
    ReportSection,
)


class TestFindingSchema:
    def test_valid_finding(self) -> None:
        f = Finding(
            domain="CPP-01",
            domain_name="Physical Security",
            question="Is the gate locked?",
            answer="No",
            severity="critical",
            recommendation="Lock the gate immediately.",
        )
        assert f.domain == "CPP-01"
        assert f.severity == "critical"

    def test_rejects_missing_domain(self) -> None:
        with pytest.raises(ValidationError):
            Finding(
                domain_name="Physical Security",
                question="Q?",
                answer="No",
                severity="critical",
                recommendation="Fix it.",
            )  # type: ignore[call-arg]

    def test_rejects_invalid_severity(self) -> None:
        with pytest.raises(ValidationError):
            Finding(
                domain="CPP-01",
                domain_name="Physical Security",
                question="Q?",
                answer="No",
                severity="extreme",
                recommendation="Fix.",
            )

    def test_optional_fields_default_none(self) -> None:
        f = Finding(
            domain="CPP-02",
            domain_name="Business Principles",
            question="Q?",
            answer="No",
            severity="high",
            recommendation="Review.",
        )
        assert f.cpp_citation is None
        assert f.requires_physical_verification is False

    def test_finding_with_cpp_citation(self) -> None:
        f = Finding(
            domain="CPP-01",
            domain_name="Physical Security",
            question="Q?",
            answer="No",
            severity="critical",
            recommendation="Fix.",
            cpp_citation={"domain": "CPP-01", "section": "4D", "excerpt": "..."},
        )
        assert f.cpp_citation["domain"] == "CPP-01"


class TestReportSection:
    def test_section_with_data(self) -> None:
        s = ReportSection(name="executive_summary", data={"urgency_score": 85})
        assert s.name == "executive_summary"

    def test_rejects_missing_name(self) -> None:
        with pytest.raises(ValidationError):
            ReportSection(data={"key": "value"})  # type: ignore[call-arg]


class TestReportData:
    def _make_findings(self, count: int = 1) -> list[Finding]:
        return [
            Finding(
                domain="CPP-01",
                domain_name="Physical Security",
                question=f"Q{i}?",
                answer="No",
                severity="critical",
                recommendation="Fix.",
            )
            for i in range(count)
        ]

    def _make_sections(self, names: list[str]) -> list[ReportSection]:
        return [ReportSection(name=n, data={}) for n in names]

    def test_valid_hni_report(self) -> None:
        rd = ReportData(
            track="hni",
            session_id="sess-123",
            findings=self._make_findings(2),
            sections=self._make_sections(
                [
                    "executive_summary",
                    "radar_scores",
                    "peer_benchmark",
                    "findings_by_severity",
                    "domain_breakdown",
                    "recommendations",
                    "next_steps",
                    "methodology",
                ]
            ),
            urgency_score=75,
            peer_benchmark_percentile=25.0,
        )
        assert rd.track == "hni"
        assert len(rd.sections) == 8

    def test_valid_enterprise_report(self) -> None:
        rd = ReportData(
            track="enterprise",
            session_id="sess-456",
            findings=self._make_findings(3),
            sections=self._make_sections(
                [
                    "board_executive_summary",
                    "radar_scores",
                    "peer_benchmark",
                    "compliance_gap_analysis",
                    "findings_by_severity",
                    "domain_breakdown",
                    "module_findings",
                    "recommendations",
                    "remediation_roadmap",
                    "methodology",
                ]
            ),
            urgency_score=90,
            peer_benchmark_percentile=10.0,
            compliance_gap_count=5,
        )
        assert rd.track == "enterprise"
        assert len(rd.sections) == 10

    def test_rejects_invalid_track(self) -> None:
        with pytest.raises(ValidationError):
            ReportData(
                track="unknown",
                session_id="s1",
                findings=[],
                sections=[],
                urgency_score=0,
                peer_benchmark_percentile=50.0,
            )

    def test_urgency_score_clamped_0_100(self) -> None:
        with pytest.raises(ValidationError):
            ReportData(
                track="hni",
                session_id="s1",
                findings=[],
                sections=[],
                urgency_score=150,
                peer_benchmark_percentile=50.0,
            )


class TestFreeSummary:
    def test_valid_free_summary(self) -> None:
        fs = FreeSummary(
            urgency_score=42,
            domains_with_gaps=["CPP-01", "CPP-05"],
            findings_preview=[],
            peer_benchmark={"percentile": 58},
        )
        assert fs.urgency_score == 42
        assert len(fs.domains_with_gaps) == 2

    def test_enterprise_has_compliance_gap_count(self) -> None:
        fs = FreeSummary(
            urgency_score=70,
            domains_with_gaps=["CPP-01"],
            findings_preview=[],
            peer_benchmark={},
            compliance_gap_count=3,
        )
        assert fs.compliance_gap_count == 3


class TestComplianceMapping:
    def test_valid_mapping(self) -> None:
        cm = ComplianceMapping(
            finding_domain="CPP-01",
            iso_clause="A.11.1.1",
            psara_section="Section 4",
            remediation_owner_role="Security Manager",
        )
        assert cm.iso_clause.startswith("A.")

    def test_rejects_missing_iso_clause(self) -> None:
        with pytest.raises(ValidationError):
            ComplianceMapping(
                finding_domain="CPP-01",
                psara_section="Section 4",
                remediation_owner_role="Manager",
            )  # type: ignore[call-arg]
