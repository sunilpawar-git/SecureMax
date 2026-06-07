"""Tests for findings engine integration with severity matrix."""

from report.findings import generate_findings
from report.schemas import Finding


class TestFindingsMatrixIntegration:
    def test_finding_includes_risk_impact_from_matrix(self) -> None:
        events = [
            {
                "domain": "CPP-01",
                "question_text": "Do you have CCTV cameras installed?",
                "question_node_id": "hni_cpp01_cctv",
                "answer": "No CCTV",
                "score_drop_trigger": True,
            },
        ]
        findings = generate_findings(events)
        assert len(findings) == 1
        assert findings[0].get("risk_impact") is not None
        assert "surveillance" in findings[0]["risk_impact"].lower()

    def test_finding_severity_from_matrix_overrides_keyword(self) -> None:
        events = [
            {
                "domain": "CPP-01",
                "question_text": "Do you have CCTV cameras installed?",
                "question_node_id": "hni_cpp01_cctv",
                "answer": "No CCTV",
                "score_drop_trigger": False,
            },
        ]
        findings = generate_findings(events)
        assert len(findings) == 1
        # Matrix says critical; keyword-only would say "high" (no trigger)
        assert findings[0]["severity"] == "critical"

    def test_unmapped_question_uses_keyword_severity(self) -> None:
        events = [
            {
                "domain": "CPP-01",
                "question_text": "Some unmapped question?",
                "question_node_id": "unmapped_node_xyz",
                "answer": "No",
                "score_drop_trigger": True,
            },
        ]
        findings = generate_findings(events)
        assert len(findings) == 1
        # Falls back to keyword: "No" + trigger = critical
        assert findings[0]["severity"] == "critical"

    def test_unmapped_question_has_no_risk_impact(self) -> None:
        events = [
            {
                "domain": "CPP-01",
                "question_text": "Some unmapped question?",
                "question_node_id": "unmapped_node_xyz",
                "answer": "No",
                "score_drop_trigger": True,
            },
        ]
        findings = generate_findings(events)
        assert len(findings) == 1
        assert findings[0].get("risk_impact") is None

    def test_findings_sorted_by_severity_then_domain(self) -> None:
        events = [
            {
                "domain": "CPP-05",
                "question_text": "Q1",
                "question_node_id": "x1",
                "answer": "No",
                "score_drop_trigger": False,
            },
            {
                "domain": "CPP-01",
                "question_text": "Q2",
                "question_node_id": "hni_cpp01_cctv",
                "answer": "No CCTV",
                "score_drop_trigger": False,
            },
        ]
        findings = generate_findings(events)
        assert len(findings) == 2
        # Matrix override makes CCTV critical; keyword gives "high" to Q1
        assert findings[0]["severity"] == "critical"
        assert findings[1]["severity"] == "high"

    def test_finding_schema_validates_risk_impact_field(self) -> None:
        finding = Finding(
            domain="CPP-01",
            domain_name="Physical Security",
            question="Test Q",
            answer="No",
            severity="critical",
            recommendation="Fix it.",
            risk_impact="No surveillance — intruders undetected",
        )
        assert finding.risk_impact == "No surveillance — intruders undetected"

    def test_finding_schema_accepts_none_risk_impact(self) -> None:
        finding = Finding(
            domain="CPP-01",
            domain_name="Physical Security",
            question="Test Q",
            answer="No",
            severity="critical",
            recommendation="Fix it.",
            risk_impact=None,
        )
        assert finding.risk_impact is None

    def test_positive_answer_matched_in_matrix_produces_no_finding(self) -> None:
        events = [
            {
                "domain": "CPP-01",
                "question_text": "Do you have CCTV cameras installed?",
                "question_node_id": "hni_cpp01_cctv",
                "answer": "Yes — full coverage",
                "score_drop_trigger": True,
            },
        ]
        findings = generate_findings(events)
        assert len(findings) == 0
