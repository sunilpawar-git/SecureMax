"""Tests for report/renderer.py — Jinja2 HTML rendering + Playwright PDF."""

from unittest.mock import AsyncMock, patch

import pytest

from report.renderer import render_html, render_pdf
from report.schemas import (
    ComplianceMapping,
    Finding,
    FreeSummary,
    ReportData,
    ReportSection,
)


def _sample_report_data(track: str = "hni") -> ReportData:
    finding = Finding(
        domain="CPP-01",
        domain_name="Physical Security",
        question="Is perimeter secured?",
        answer="No",
        severity="critical",
        recommendation="Install perimeter fencing.",
    )
    section = ReportSection(
        name="executive_summary",
        data={"urgency_score": 75, "total_findings": 1},
    )
    free_summary = FreeSummary(
        urgency_score=75,
        domains_with_gaps=["CPP-01"],
        findings_preview=[],
        peer_benchmark={"percentile": 35.0},
    )
    kwargs: dict = {
        "track": track,
        "session_id": "test-session-001",
        "findings": [finding],
        "sections": [section],
        "urgency_score": 75,
        "peer_benchmark_percentile": 35.0,
        "executive_summary": "Critical gaps found in physical security.",
        "radar_scores": {"CPP-01": 25.0, "CPP-02": 80.0},
        "free_summary": free_summary,
    }
    if track == "enterprise":
        kwargs["board_summary"] = "Board action required."
        kwargs["compliance_gap_count"] = 3
        kwargs["compliance_mappings"] = [
            ComplianceMapping(
                finding_domain="CPP-01",
                iso_clause="A.11.1.1",
                psara_section="Section 10",
                remediation_owner_role="Facility Security Manager",
            )
        ]
    return ReportData(**kwargs)


class TestRenderHTML:
    def test_returns_string(self) -> None:
        html = render_html(_sample_report_data())
        assert isinstance(html, str)
        assert len(html) > 0

    def test_contains_session_id(self) -> None:
        html = render_html(_sample_report_data())
        assert "test-session" in html

    def test_contains_findings(self) -> None:
        html = render_html(_sample_report_data())
        assert "Physical Security" in html
        assert "Install perimeter fencing" in html

    def test_hni_does_not_show_board_summary(self) -> None:
        html = render_html(_sample_report_data("hni"))
        assert "Board" not in html or "board_summary" not in html

    def test_enterprise_shows_board_summary(self) -> None:
        html = render_html(_sample_report_data("enterprise"))
        assert "Board action required" in html

    def test_enterprise_shows_compliance(self) -> None:
        html = render_html(_sample_report_data("enterprise"))
        assert "A.11.1.1" in html
        assert "PSARA" in html or "Section 10" in html

    def test_contains_confidentiality_notice(self) -> None:
        html = render_html(_sample_report_data())
        assert "CONFIDENTIAL" in html

    def test_html_escapes_xss(self) -> None:
        data = _sample_report_data()
        data.executive_summary = '<script>alert("xss")</script>'
        html = render_html(data)
        assert "<script>" not in html
        assert "&lt;script&gt;" in html


class TestRenderPDF:
    @pytest.mark.asyncio
    async def test_returns_bytes(self) -> None:
        mock_page = AsyncMock()
        mock_page.pdf = AsyncMock(return_value=b"%PDF-1.4 mock")
        mock_page.set_content = AsyncMock()

        mock_browser = AsyncMock()
        mock_browser.new_page = AsyncMock(return_value=mock_page)

        mock_pw = AsyncMock()
        mock_pw.chromium.launch = AsyncMock(return_value=mock_browser)

        with patch(
            "report.renderer.async_playwright"
        ) as mock_pw_ctx:
            mock_pw_ctx.return_value.__aenter__ = AsyncMock(
                return_value=mock_pw
            )
            mock_pw_ctx.return_value.__aexit__ = AsyncMock(
                return_value=False
            )
            result = await render_pdf(_sample_report_data())

        assert isinstance(result, bytes)
        assert result == b"%PDF-1.4 mock"
        mock_page.set_content.assert_called_once()
        mock_page.pdf.assert_called_once()

    @pytest.mark.asyncio
    async def test_pdf_called_with_format_a4(self) -> None:
        mock_page = AsyncMock()
        mock_page.pdf = AsyncMock(return_value=b"%PDF")
        mock_page.set_content = AsyncMock()

        mock_browser = AsyncMock()
        mock_browser.new_page = AsyncMock(return_value=mock_page)

        mock_pw = AsyncMock()
        mock_pw.chromium.launch = AsyncMock(return_value=mock_browser)

        with patch(
            "report.renderer.async_playwright"
        ) as mock_pw_ctx:
            mock_pw_ctx.return_value.__aenter__ = AsyncMock(
                return_value=mock_pw
            )
            mock_pw_ctx.return_value.__aexit__ = AsyncMock(
                return_value=False
            )
            await render_pdf(_sample_report_data())

        call_kwargs = mock_page.pdf.call_args
        assert call_kwargs.kwargs.get("format") == "A4"
