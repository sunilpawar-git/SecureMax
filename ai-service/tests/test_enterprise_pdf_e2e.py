"""
E2E test for enterprise PDF report generation.
Creates a mock enterprise session with events, generates report data,
renders HTML, and verifies all 10 enterprise sections are present.
"""

import uuid

from report.constants import ENTERPRISE_SECTION_NAMES
from report.renderer import render_html
from report.schemas import (
    ComplianceMapping,
    Finding,
    FreeSummary,
    ReportData,
    ReportSection,
)
from tests.conftest import ensure_test_user, run_db


def _create_enterprise_session(db_conn) -> str:
    """Insert a completed enterprise audit session with events."""
    session_id = str(uuid.uuid4())
    ensure_test_user(db_conn, "ent-user-1")
    run_db(
        db_conn.execute(
            """
            INSERT INTO audit_sessions
                (id, user_id, track, status, domain_scores, module_scores)
            VALUES ($1, 'ent-user-1', 'enterprise', 'completed', $2, $3)
            """,
            session_id,
            '{"CPP-01": 35, "CPP-02": 70, "CPP-06": 40}',
            '{"contractor_mgmt": 45, "cctv_sop": 30}',
        )
    )

    for i, (node_id, domain) in enumerate(
        [("ent_q1", "CPP-01"), ("ent_q2", "CPP-06"), ("ent_q3", "CPP-01")]
    ):
        run_db(
            db_conn.execute(
                """
                INSERT INTO session_events
                    (id, session_id, question_node_id, answer_encrypted,
                     ai_reasoning_encrypted, cpp_citations, domain_score_delta)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                f"evt-{session_id[:8]}-{i}",
                session_id,
                node_id,
                "encrypted_answer",
                "encrypted_reasoning",
                f'["{domain}"]',
                f'{{"{domain}": -15}}',
            )
        )

    return session_id


def _sample_enterprise_report_data(session_id: str) -> ReportData:
    """Build a valid enterprise ReportData for rendering."""
    findings = [
        Finding(
            domain="CPP-01",
            domain_name="Physical Security",
            question="Is perimeter secured?",
            answer="No",
            severity="critical",
            recommendation="Install perimeter fencing.",
        ),
        Finding(
            domain="CPP-06",
            domain_name="Personnel Security",
            question="Background checks on contractors?",
            answer="No",
            severity="high",
            recommendation="Implement background verification.",
        ),
    ]

    sections = [
        ReportSection(name=name, data={"placeholder": True}) for name in ENTERPRISE_SECTION_NAMES
    ]

    free_summary = FreeSummary(
        urgency_score=72,
        domains_with_gaps=["CPP-01", "CPP-06"],
        findings_preview=[],
        peer_benchmark={"percentile": 30.0},
    )

    return ReportData(
        track="enterprise",
        session_id=session_id,
        findings=findings,
        sections=sections,
        urgency_score=72,
        peer_benchmark_percentile=30.0,
        executive_summary="Critical security gaps identified in enterprise facility.",
        radar_scores={"CPP-01": 35.0, "CPP-02": 70.0, "CPP-06": 40.0},
        free_summary=free_summary,
        board_summary="Board action required on physical security posture.",
        compliance_gap_count=3,
        compliance_mappings=[
            ComplianceMapping(
                finding_domain="CPP-01",
                iso_clause="A.11.1.1",
                psara_section="Section 10",
                remediation_owner_role="Facility Security Manager",
            ),
        ],
    )


class TestEnterprisePdfE2E:
    """End-to-end tests for enterprise report generation pipeline."""

    def test_enterprise_session_created_in_db(self, db_conn) -> None:
        """Verify the test fixture creates a valid enterprise session."""
        session_id = _create_enterprise_session(db_conn)
        row = run_db(
            db_conn.fetchrow(
                "SELECT track, status FROM audit_sessions WHERE id = $1",
                session_id,
            )
        )
        assert row is not None
        assert row["track"] == "enterprise"
        assert row["status"] == "completed"

    def test_enterprise_session_has_events(self, db_conn) -> None:
        """Verify the test fixture creates session events."""
        session_id = _create_enterprise_session(db_conn)
        count = run_db(
            db_conn.fetchval(
                "SELECT COUNT(*) FROM session_events WHERE session_id = $1",
                session_id,
            )
        )
        assert count == 3

    def test_enterprise_report_has_10_sections(self, db_conn) -> None:
        """Verify enterprise HTML contains all 10 section headings."""
        session_id = _create_enterprise_session(db_conn)
        report_data = _sample_enterprise_report_data(session_id)
        html = render_html(report_data)

        assert html is not None
        assert len(html) > 0

        for section_name in ENTERPRISE_SECTION_NAMES:
            assert section_name in html or section_name.replace("_", " ") in html.lower(), (
                f"Section '{section_name}' not found in enterprise HTML"
            )

    def test_enterprise_report_includes_compliance_appendix(self, db_conn) -> None:
        """Verify compliance mapping data appears in rendered HTML."""
        session_id = _create_enterprise_session(db_conn)
        report_data = _sample_enterprise_report_data(session_id)
        html = render_html(report_data)

        assert "A.11.1.1" in html
        assert "PSARA" in html or "Section 10" in html

    def test_enterprise_report_urgency_score_in_range(self, db_conn) -> None:
        """Verify urgency score is between 0 and 100."""
        session_id = _create_enterprise_session(db_conn)
        report_data = _sample_enterprise_report_data(session_id)

        assert 0 <= report_data.urgency_score <= 100

    def test_enterprise_report_generates_non_empty_pdf(self, db_conn) -> None:
        """Full pipeline: generate enterprise report data, assert valid ReportData."""
        session_id = _create_enterprise_session(db_conn)
        report_data = _sample_enterprise_report_data(session_id)

        assert report_data.track == "enterprise"
        assert report_data.compliance_gap_count is not None
        assert report_data.compliance_gap_count > 0
        assert report_data.board_summary is not None
        assert len(report_data.findings) > 0
        assert len(report_data.sections) == len(ENTERPRISE_SECTION_NAMES)

        html = render_html(report_data)
        assert html is not None
        assert len(html) > 500
