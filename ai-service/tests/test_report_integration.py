"""Integration test — full report generation pipeline with new templates.
Exercises: findings → severity matrix → radar → enrichment → template → HTML output.
"""

from report.findings import generate_findings
from report.radar_svg import generate_radar_svg
from report.renderer import render_html
from report.schemas import Finding, ReportData


def _sample_events() -> list[dict]:
    return [
        {
            "domain": "CPP-01",
            "question_text": "Do you have CCTV cameras installed?",
            "question_node_id": "hni_cpp01_cctv",
            "answer": "No CCTV",
            "score_drop_trigger": True,
        },
        {
            "domain": "CPP-01",
            "question_text": "Is your gate access code shared?",
            "question_node_id": "hni_cpp01_gate_code",
            "answer": "Yes",
            "score_drop_trigger": True,
        },
        {
            "domain": "CPP-03",
            "question_text": "Do you have an emergency response plan?",
            "question_node_id": "hni_cpp03_emergency_plan",
            "answer": "No plan exists",
            "score_drop_trigger": True,
        },
        {
            "domain": "CPP-06",
            "question_text": "Are your security guards vetted?",
            "question_node_id": "hni_cpp06_guard_vetting",
            "answer": "Never",
            "score_drop_trigger": True,
        },
        {
            "domain": "CPP-05",
            "question_text": "Is your security network segregated?",
            "question_node_id": "hni_cpp05_network_segregation",
            "answer": "No — same network",
            "score_drop_trigger": True,
        },
    ]


def _sample_radar_scores() -> dict[str, float]:
    return {
        "CPP-01": 25.0,
        "CPP-02": 80.0,
        "CPP-03": 30.0,
        "CPP-04": 70.0,
        "CPP-05": 20.0,
        "CPP-06": 15.0,
        "CPP-07": 65.0,
    }


class TestFullReportPipeline:
    def test_findings_generated_with_matrix_severity(self) -> None:
        events = _sample_events()
        findings = generate_findings(events)
        assert len(findings) >= 4
        cctv_finding = next((f for f in findings if "cctv" in f.get("question", "").lower()), None)
        assert cctv_finding is not None
        assert cctv_finding["severity"] == "critical"
        assert cctv_finding["risk_impact"] is not None

    def test_radar_svg_renders_from_scores(self) -> None:
        scores = _sample_radar_scores()
        svg = generate_radar_svg(scores)
        assert "<svg" in svg
        assert "25" in svg  # CPP-01 score
        assert "polygon" in svg

    def test_html_render_with_findings_and_radar(self) -> None:
        events = _sample_events()
        findings_raw = generate_findings(events)
        findings = [
            Finding(
                domain=f["domain"],
                domain_name=f["domain_name"],
                question=f["question"],
                answer=f["answer"],
                severity=f["severity"],
                recommendation="Implement remediation.",
                risk_impact=f.get("risk_impact"),
            )
            for f in findings_raw
        ]

        report = ReportData(
            session_id="test-session-1234",
            track="hni",
            findings=findings,
            urgency_score=75,
            peer_benchmark_percentile=22.0,
            radar_scores=_sample_radar_scores(),
            executive_summary="This is the AI-generated executive summary.",
        )

        html = render_html(report)

        assert "test-session" in html
        assert "Executive Summary" in html
        assert "Security Findings" in html
        assert "Physical Security Audit Report" in html
        assert "Critical" in html or "critical" in html
        assert "svg" in html
        assert "Raivan Global" in html

    def test_html_render_enterprise_with_compliance(self) -> None:
        from report.schemas import ComplianceMapping

        findings = [
            Finding(
                domain="CPP-01",
                domain_name="Physical Security",
                question="CCTV?",
                answer="No",
                severity="critical",
                recommendation="Install CCTV.",
                risk_impact="No surveillance",
            )
        ]
        mappings = [
            ComplianceMapping(
                finding_domain="CPP-01",
                iso_clause="A.11.1.1",
                psara_section="Section 10",
                remediation_owner_role="Security Manager",
            )
        ]

        report = ReportData(
            session_id="ent-session-5678",
            track="enterprise",
            findings=findings,
            urgency_score=60,
            peer_benchmark_percentile=35.0,
            radar_scores=_sample_radar_scores(),
            compliance_mappings=mappings,
            compliance_gap_count=1,
            board_summary="Board-level risk briefing here.",
        )

        html = render_html(report)

        assert "Enterprise Security Audit Report" in html
        assert "Board Executive Summary" in html
        assert "Compliance Gap Analysis" in html
        assert "A.11.1.1" in html
        assert "Section 10" in html

    def test_html_render_minimal_report_no_crash(self) -> None:
        report = ReportData(
            session_id="min-session",
            track="hni",
            findings=[],
            urgency_score=0,
            peer_benchmark_percentile=90.0,
        )
        html = render_html(report)
        assert "Physical Security Audit Report" in html
        assert "0" in html  # urgency score

    def test_findings_sorted_critical_first(self) -> None:
        events = _sample_events()
        findings = generate_findings(events)
        severities = [f["severity"] for f in findings]
        critical_indices = [i for i, s in enumerate(severities) if s == "critical"]
        high_indices = [i for i, s in enumerate(severities) if s == "high"]
        if critical_indices and high_indices:
            assert max(critical_indices) < min(high_indices)

    def test_xss_escaped_in_html_output(self) -> None:
        findings = [
            Finding(
                domain="CPP-01",
                domain_name="Physical Security",
                question="<script>alert('xss')</script>",
                answer="No",
                severity="critical",
                recommendation="Fix it.",
            )
        ]
        report = ReportData(
            session_id="xss-test",
            track="hni",
            findings=findings,
            urgency_score=50,
            peer_benchmark_percentile=50.0,
        )
        html = render_html(report)
        assert "<script>" not in html
        assert "&lt;script&gt;" in html

    def test_executive_brief_excludes_findings(self) -> None:
        """Executive brief mode omits detailed findings."""
        from report.renderer import render_executive_brief

        findings = [
            Finding(
                domain="CPP-01",
                domain_name="Physical Security",
                question="CCTV installed?",
                answer="No",
                severity="critical",
                recommendation="Install CCTV.",
            )
        ]
        report = ReportData(
            session_id="split-test",
            track="hni",
            findings=findings,
            urgency_score=65,
            peer_benchmark_percentile=35.0,
            radar_scores=_sample_radar_scores(),
            executive_summary="High-level overview.",
        )
        html = render_executive_brief(report)
        assert "Executive Summary" in html
        assert "Domain Security Scores" in html
        assert "Security Findings" not in html
        assert "CCTV installed?" not in html

    def test_technical_annex_excludes_exec_summary(self) -> None:
        """Technical annex mode omits executive summary."""
        from report.renderer import render_technical_annex

        findings = [
            Finding(
                domain="CPP-01",
                domain_name="Physical Security",
                question="CCTV installed?",
                answer="No",
                severity="critical",
                recommendation="Install CCTV.",
            )
        ]
        report = ReportData(
            session_id="split-test-2",
            track="hni",
            findings=findings,
            urgency_score=65,
            peer_benchmark_percentile=35.0,
            radar_scores=_sample_radar_scores(),
            executive_summary="High-level overview.",
        )
        html = render_technical_annex(report)
        assert "Security Findings" in html
        assert "CCTV installed?" in html
        assert "Executive Summary" not in html
        assert "High-level overview." not in html
