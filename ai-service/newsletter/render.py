"""
One-pager rendering: newsletter content -> branded HTML -> PNG via Playwright.
build_newsletter_html() is pure (testable without a browser); render_png()
needs Chromium (already a project dependency via the scraper).

All article-derived text is HTML-escaped -- scraped content is untrusted input.
"""

from __future__ import annotations

import html as html_mod
import re
from string import Template

from newsletter.constants import (
    BRAND_NAME,
    BRAND_TAGLINE,
    COLOR_ACCENT,
    COLOR_BG,
    COLOR_CARD,
    COLOR_MUTED,
    COLOR_TEXT,
    SEGMENT_SHORT_LABELS,
)
from newsletter.models import NewsletterContent
from newsletter.utils import domain_label

PAGE_WIDTH = 1080
PAGE_HEIGHT = 1350  # initial viewport hint only -- screenshot uses full_page=True

_BULLET_RE = re.compile(r"^(?:[-*]|\d+\.)\s")

_PAGE_TMPL = Template("""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: ${width}px; background: ${bg};
         font-family: 'Helvetica Neue', Arial, sans-serif; color: ${text};
         display: flex; flex-direction: column; padding: 56px; }
  .brand { color: ${accent}; font-size: 30px; font-weight: 700; letter-spacing: 1px; }
  .tagline { color: ${muted}; font-size: 20px; margin-top: 6px; }
  .meta { color: ${muted}; font-size: 18px; margin-top: 12px; }
  h1 { font-size: 52px; line-height: 1.15; margin: 36px 0 18px; }
  .intro { font-size: 26px; color: ${muted}; line-height: 1.4; margin-bottom: 30px; }
  .intro-bullets { font-size: 26px; color: ${muted}; line-height: 1.5;
                   margin-bottom: 30px; padding-left: 28px; }
  .intro-bullets li { margin-bottom: 8px; }
  .item { background: ${card}; border-left: 6px solid ${accent};
          border-radius: 10px; padding: 22px 26px; margin-bottom: 20px; }
  .domain { color: ${accent}; font-size: 18px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 1px; }
  .headline { font-size: 28px; font-weight: 600; margin: 8px 0; line-height: 1.25; }
  .takeaway { font-size: 22px; color: ${muted}; line-height: 1.35; }
  .segments { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
  .seg-tag { background: ${accent}20; color: ${accent}; font-size: 14px;
             padding: 4px 10px; border-radius: 4px; }
  .cta { margin-top: 36px; background: ${accent}; color: ${bg}; font-size: 26px;
         font-weight: 700; padding: 24px 30px; border-radius: 12px; text-align: center; }
</style></head>
<body>
  <div class="brand">${brand}</div>
  <div class="tagline">${tagline}</div>
  <div class="meta">${issue_date} | Analysis of ${source_count} sources</div>
  <h1>${title}</h1>
  ${intro_html}
  ${items_html}
  <div class="cta">${cta}</div>
</body></html>""")

_ITEM_TMPL = Template(
    '<div class="item"><div class="domain">${domain}</div>'
    '<div class="headline">${headline}</div>'
    '<div class="takeaway">${takeaway}</div>'
    '${segments_html}</div>'
)


def _render_intro(text: str) -> str:
    """Render executive summary as bullet list or paragraph (HTML-escaped)."""
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    bullets = [ln for ln in lines if _BULLET_RE.match(ln)]
    if bullets and len(bullets) >= len(lines) // 2:
        items = "".join(
            f"<li>{html_mod.escape(_BULLET_RE.sub('', ln).strip())}</li>"
            for ln in lines if _BULLET_RE.match(ln)
        )
        return f'<ul class="intro-bullets">{items}</ul>'
    return f'<div class="intro">{html_mod.escape(text)}</div>'


def _build_segment_tags(theme) -> str:
    """Build segment tag HTML from a theme's segment_impact."""
    seg = theme.segment_impact
    if not seg:
        return ""
    tags = []
    for key, label in SEGMENT_SHORT_LABELS.items():
        if getattr(seg, key, ""):
            tags.append(f'<span class="seg-tag">{html_mod.escape(label)}</span>')
    if not tags:
        return ""
    return f'<div class="segments">{"".join(tags)}</div>'


def build_newsletter_html(content: NewsletterContent) -> str:
    """Render newsletter content into the branded one-pager HTML (escaped)."""
    if not isinstance(content, NewsletterContent):
        raise TypeError(
            f"build_newsletter_html requires NewsletterContent, "
            f"got {type(content).__name__}"
        )

    source_count = len({
        aid for t in content.themes for aid in t.source_article_ids
    })
    title = content.title or ""
    intro_html = _render_intro(content.executive_summary or "")
    cta = content.cta_soft or "Is your organization prepared? Book a security audit."

    items_html = ""
    for t in content.themes[:5]:
        items_html += _ITEM_TMPL.substitute(
            domain=html_mod.escape(domain_label(t.cpp_domain)),
            headline=html_mod.escape(t.theme_title),
            takeaway=html_mod.escape(t.recommendation),
            segments_html=_build_segment_tags(t),
        )

    return _PAGE_TMPL.substitute(
        width=PAGE_WIDTH,
        bg=COLOR_BG,
        card=COLOR_CARD,
        text=COLOR_TEXT,
        muted=COLOR_MUTED,
        accent=COLOR_ACCENT,
        brand=html_mod.escape(BRAND_NAME),
        tagline=html_mod.escape(BRAND_TAGLINE),
        issue_date=html_mod.escape(content.issue_date or ""),
        source_count=str(source_count),
        title=html_mod.escape(title),
        intro_html=intro_html,
        items_html=items_html,
        cta=html_mod.escape(cta),
    )


async def render_png(
    html: str, *, width: int = PAGE_WIDTH, height: int = PAGE_HEIGHT
) -> bytes:
    """Screenshot the HTML as a PNG using headless Chromium."""
    import asyncio

    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            page = await browser.new_page(viewport={"width": width, "height": height})
            await asyncio.wait_for(
                page.set_content(html, wait_until="load"), timeout=30.0
            )
            return await page.screenshot(type="png", full_page=True)
        finally:
            await browser.close()
