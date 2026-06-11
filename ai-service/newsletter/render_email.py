"""
Email HTML renderer — responsive, branded email newsletter.
Uses inline styles for maximum email client compatibility.

Structure:
  Header        — brand name, issue date
  Summary bar   — executive summary preview (≤ 300 chars, word-boundary)
  Main body     — intelligence_briefing (the 800–1200-word composed prose tier)
  Theme cards   — per-theme SITREP appendix with segment callouts
  Commander's Perspective
  CTA
  Footer
"""

import html

from newsletter.constants import (
    BRAND_NAME,
    BRAND_SIGN_OFF,
    COLOR_ACCENT,
    COLOR_BG,
    COLOR_CARD,
    COLOR_MUTED,
    COLOR_TEXT,
)
from newsletter.models import NewsletterContent
from newsletter.utils import domain_label, safe_url


def _esc(text: str) -> str:
    return html.escape(str(text))


def _truncate_words(text: str, max_chars: int) -> str:
    """Truncate at a word boundary; append ellipsis if cut."""
    if len(text) <= max_chars:
        return text
    cut = text[:max_chars].rsplit(" ", 1)[0]
    return cut + "…"


def _prose_to_html(text: str, style: str = "") -> str:
    """Convert newline-separated prose into <p> tags."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        return f'<p style="{style}">{_esc(text)}</p>'
    return "".join(f'<p style="margin:0 0 12px;{style}">{_esc(p)}</p>' for p in paragraphs)


def render_email_html(content: NewsletterContent) -> str:
    """Render the intelligence briefing tier as a responsive email HTML."""

    # --- Summary bar (executive summary preview) ---
    preview = _truncate_words(content.executive_summary, 300)
    summary_bar = f"""
    <tr><td style="padding:0 0 20px;">
      <p style="color:{COLOR_MUTED};font-size:15px;line-height:1.6;margin:0;
                font-style:italic;border-left:3px solid {COLOR_ACCENT};padding-left:12px;">
        {_esc(preview)}</p>
    </td></tr>"""

    # --- Main body: intelligence briefing prose ---
    briefing_body = ""
    if content.intelligence_briefing:
        briefing_html = _prose_to_html(
            content.intelligence_briefing,
            f"color:{COLOR_TEXT};font-size:15px;line-height:1.7;",
        )
        briefing_body = f"""
    <tr><td style="padding:0 0 24px;">
      <h2 style="color:{COLOR_ACCENT};margin:0 0 16px;font-size:18px;">
        Intelligence Briefing</h2>
      {briefing_html}
    </td></tr>"""

    # --- Theme appendix: per-theme SITREP cards ---
    themes_html = ""
    for theme in content.themes:
        seg = theme.segment_impact
        seg_rows = ""
        if seg and (seg.hni or seg.enterprise or seg.critical_infrastructure):
            seg_items = []
            if seg.hni:
                seg_items.append(
                    f'<li style="color:{COLOR_TEXT};margin:4px 0;">'
                    f"Private Residences: {_esc(seg.hni)}</li>"
                )
            if seg.enterprise:
                seg_items.append(
                    f'<li style="color:{COLOR_TEXT};margin:4px 0;">'
                    f"Corporates: {_esc(seg.enterprise)}</li>"
                )
            if seg.critical_infrastructure:
                seg_items.append(
                    f'<li style="color:{COLOR_TEXT};margin:4px 0;">'
                    f"Critical Infrastructure: {_esc(seg.critical_infrastructure)}</li>"
                )
            seg_rows = (
                f'<p style="color:{COLOR_ACCENT};font-weight:bold;margin:12px 0 4px;">'
                f"Segment Impact</p>"
                f'<ul style="padding-left:20px;margin:0;">{"".join(seg_items)}</ul>'
            )

        themes_html += f"""
        <tr><td style="padding:8px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="
            background:{COLOR_CARD};border-radius:8px;border-left:4px solid {COLOR_ACCENT};
          "><tr><td style="padding:16px 20px;">
            <h3 style="color:{COLOR_ACCENT};margin:0 0 8px;font-size:16px;">
              {_esc(theme.theme_title)}
              <span style="color:{COLOR_MUTED};font-size:12px;font-weight:normal;">
                &nbsp;({_esc(domain_label(theme.cpp_domain))})
              </span>
            </h3>
            <p style="color:{COLOR_TEXT};margin:6px 0;font-size:14px;">
              <strong>Situation:</strong> {_esc(theme.situation)}</p>
            <p style="color:{COLOR_TEXT};margin:6px 0;font-size:14px;">
              <strong>Assessment:</strong> {_esc(theme.assessment)}</p>
            <p style="color:{COLOR_TEXT};margin:6px 0;font-size:14px;">
              <strong>Recommendation:</strong> {_esc(theme.recommendation)}</p>
            {seg_rows}
          </td></tr></table>
        </td></tr>"""

    theme_section = ""
    if themes_html:
        theme_section = f"""
    <tr><td style="padding:8px 0 24px;">
      <h2 style="color:{COLOR_ACCENT};margin:0 0 12px;font-size:18px;">
        Theme Breakdown</h2>
      <table width="100%" cellpadding="0" cellspacing="0">
        {themes_html}
      </table>
    </td></tr>"""

    # --- Commander's Perspective ---
    commanders = ""
    if content.commanders_note:
        commanders = f"""
    <tr><td style="padding:8px 0 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="
        background:{COLOR_CARD};border-radius:8px;
      "><tr><td style="padding:20px;">
        <h2 style="color:{COLOR_ACCENT};margin:0 0 8px;font-size:16px;">
          Commander's Perspective</h2>
        <p style="color:{COLOR_TEXT};font-style:italic;margin:0;font-size:14px;">
          {_esc(content.commanders_note)}</p>
      </td></tr></table>
    </td></tr>"""

    # --- CTA ---
    cta_section = ""
    if content.cta_soft:
        cta_section = f"""
    <tr><td style="padding:24px 0;text-align:center;">
      <p style="color:{COLOR_TEXT};font-size:16px;margin:0 0 16px;">
        {_esc(content.cta_soft)}</p>
      <a href="{_esc(safe_url(content.cta_audit_link))}" style="
        display:inline-block;background:{COLOR_ACCENT};color:{COLOR_BG};
        padding:12px 32px;border-radius:6px;text-decoration:none;
        font-weight:bold;font-size:15px;
      ">Start Your Security Assessment</a>
    </td></tr>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{_esc(content.title)}</title></head>
<body style="margin:0;padding:0;background:{COLOR_BG};font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:{COLOR_BG};">
<tr><td align="center" style="padding:24px 16px;">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <tr><td style="padding:24px 0;text-align:center;">
      <h1 style="color:{COLOR_ACCENT};margin:0;font-size:24px;">{_esc(BRAND_NAME)}</h1>
      <p style="color:{COLOR_MUTED};margin:4px 0 0;font-size:13px;">
        Weekly Threat Intelligence &mdash; {_esc(content.issue_date)}</p>
    </td></tr>
    <tr><td style="padding:0 0 20px;">
      <h2 style="color:{COLOR_TEXT};margin:0 0 8px;font-size:20px;">
        {_esc(content.title)}</h2>
    </td></tr>
    {summary_bar}
    {briefing_body}
    {theme_section}
    {commanders}
    {cta_section}
    <tr><td style="padding:24px 0;text-align:center;
                   border-top:1px solid {COLOR_CARD};">
      <p style="color:{COLOR_MUTED};font-size:12px;margin:0;">
        {_esc(BRAND_SIGN_OFF)}</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>"""
