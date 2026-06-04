"""
HTML + PDF rendering pipeline.
Jinja2 renders ReportData → HTML; Playwright converts HTML → PDF bytes.
"""

import asyncio
import logging
from datetime import UTC, datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from playwright.async_api import async_playwright

from config import TRACK_ENTERPRISE
from report.constants import (
    CONFIDENTIALITY_NOTICE,
    DEFAULT_WHITE_LABEL,
    SEVERITY_COLORS,
    TEMPLATE_COLORS,
)
from report.radar_svg import generate_radar_svg
from report.schemas import ReportData

logger = logging.getLogger(__name__)

_TEMPLATE_DIR = Path(__file__).parent / "templates"
_SESSION_ID_LOG_CHARS = 8

_jinja_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATE_DIR)),
    autoescape=select_autoescape(["html"]),
    trim_blocks=True,
    lstrip_blocks=True,
)


def render_html(
    report: ReportData,
    *,
    branding: dict | None = None,
    section_mode: str = "full",
) -> str:
    """Render ReportData to a full HTML string.

    Args:
        section_mode: "full" (default), "executive", or "technical".
            - "executive": cover + summary + radar only (no findings detail)
            - "technical": findings + threat intel + methodology (no cover/summary)
    """
    brand = branding or dict(DEFAULT_WHITE_LABEL)
    template_name = (
        "enterprise_report.html"
        if report.track == TRACK_ENTERPRISE
        else "hni_report.html"
    )
    template = _jinja_env.get_template(template_name)

    radar_svg = generate_radar_svg(report.radar_scores) if report.radar_scores else ""

    now = datetime.now(UTC)
    return template.render(
        report=report,
        branding=brand,
        colors=TEMPLATE_COLORS,
        severity_colors=SEVERITY_COLORS,
        confidentiality_notice=CONFIDENTIALITY_NOTICE,
        radar_svg=radar_svg,
        generated_at=now.strftime("%d %b %Y %H:%M UTC"),
        year=now.year,
        title=f"{brand.get('company_name', 'Raivan Global')} Security Report",
        section_mode=section_mode,
    )


def render_executive_brief(report: ReportData, *, branding: dict | None = None) -> str:
    """Render only the executive brief portion of the report."""
    return render_html(report, branding=branding, section_mode="executive")


def render_technical_annex(report: ReportData, *, branding: dict | None = None) -> str:
    """Render only the technical findings/annex portion."""
    return render_html(report, branding=branding, section_mode="technical")


async def render_pdf(
    report: ReportData,
    *,
    branding: dict | None = None,
) -> bytes:
    """Render ReportData → HTML → PDF bytes via Playwright."""
    html = await asyncio.to_thread(render_html, report, branding=branding)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        try:
            page = await browser.new_page()
            await page.set_content(html, wait_until="load")
            pdf_bytes = await page.pdf(
                format="A4",
                print_background=True,
                margin={
                    "top": "20mm",
                    "bottom": "20mm",
                    "left": "15mm",
                    "right": "15mm",
                },
            )
        finally:
            await browser.close()

    logger.info(
        "PDF rendered for session %.8s (%d bytes)",
        report.session_id,
        len(pdf_bytes),
    )
    return pdf_bytes
