"""
Website HTML renderer — full analysis tier for the public /intelligence page.
Semantic HTML with CSS classes (not inline styles).

Structure:
  <header>          — title, brand, issue date
  Executive Summary — teaser paragraph
  Full Analysis     — full_analysis composed prose (1500–2500 words)
  Theme Breakdown   — per-theme SITREP cards with CPP citations + segment impact
  Commander's Note
  CTA
  <footer>
"""

import html

from newsletter.constants import BRAND_NAME, BRAND_SIGN_OFF
from newsletter.models import NewsletterContent
from newsletter.utils import domain_label, safe_url


def _esc(text: str) -> str:
    return html.escape(str(text))


def _prose_to_html(text: str, css_class: str = "") -> str:
    """Convert newline-separated prose into <p> tags."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        return f'<p class="{css_class}">{_esc(text)}</p>'
    cls = f' class="{css_class}"' if css_class else ""
    return "".join(f"<p{cls}>{_esc(p)}</p>" for p in paragraphs)


def render_website_html(content: NewsletterContent) -> str:
    """Render the full analysis tier as semantic HTML for the website."""

    # --- Full analysis prose ---
    full_analysis_section = ""
    if content.full_analysis:
        full_analysis_section = f"""
  <section class="full-analysis">
    <h2>Intelligence Analysis</h2>
    {_prose_to_html(content.full_analysis, "analysis-para")}
  </section>"""

    # --- Per-theme breakdown ---
    themes_html = ""
    for theme in content.themes:
        seg = theme.segment_impact
        seg_section = ""
        if seg and (seg.hni or seg.enterprise or seg.critical_infrastructure):
            items = []
            if seg.hni:
                items.append(f"<li><strong>Private Residences:</strong> {_esc(seg.hni)}</li>")
            if seg.enterprise:
                items.append(f"<li><strong>Corporates:</strong> {_esc(seg.enterprise)}</li>")
            if seg.critical_infrastructure:
                items.append(
                    "<li><strong>Critical Infrastructure:</strong> "
                    f"{_esc(seg.critical_infrastructure)}</li>"
                )
            seg_section = (
                '<div class="segment-impact">'
                "<h4>Segment Impact</h4>"
                f"<ul>{''.join(items)}</ul></div>"
            )

        cpp_cite = ""
        if theme.cpp_citation:
            cpp_cite = f'<p class="cpp-citation"><em>Source: {_esc(theme.cpp_citation)}</em></p>'

        themes_html += f"""
    <section class="theme-card" data-domain="{_esc(theme.cpp_domain)}">
      <h3>{_esc(theme.theme_title)}
        <span class="domain-badge">{_esc(domain_label(theme.cpp_domain))}</span></h3>
      <div class="sitrep">
        <p><strong>Situation:</strong> {_esc(theme.situation)}</p>
        <p><strong>Assessment:</strong> {_esc(theme.assessment)}</p>
        <p><strong>Implications:</strong> {_esc(theme.implications)}</p>
        <p><strong>Recommendation:</strong> {_esc(theme.recommendation)}</p>
      </div>
      {cpp_cite}
      {seg_section}
    </section>"""

    theme_breakdown = ""
    if themes_html:
        theme_breakdown = f"""
  <section class="theme-breakdown">
    <h2>Theme Breakdown</h2>
    {themes_html}
  </section>"""

    commanders = ""
    if content.commanders_note:
        commanders = f"""
  <section class="commanders-note">
    <h3>Commander's Perspective</h3>
    <blockquote>{_esc(content.commanders_note)}</blockquote>
  </section>"""

    cta = ""
    if content.cta_soft:
        cta = f"""
  <section class="cta-section">
    <p>{_esc(content.cta_soft)}</p>
    <a href="{_esc(safe_url(content.cta_audit_link))}" class="cta-button">
      Start Your Security Assessment</a>
  </section>"""

    return f"""<article class="intelligence-report">
  <header>
    <h1>{_esc(content.title)}</h1>
    <p class="issue-meta">{_esc(BRAND_NAME)} &mdash; {_esc(content.issue_date)}</p>
  </header>

  <section class="executive-summary">
    <h2>Executive Summary</h2>
    <p>{_esc(content.executive_summary)}</p>
  </section>
{full_analysis_section}
{theme_breakdown}
{commanders}
{cta}

  <footer>
    <p class="sign-off">{_esc(BRAND_SIGN_OFF)}</p>
  </footer>
</article>"""
