"""
One-pager rendering: newsletter content → branded HTML → PNG via Playwright.
build_newsletter_html() is pure (testable without a browser); render_png()
needs Chromium (already a project dependency via the scraper).

All article-derived text is HTML-escaped — scraped content is untrusted input.
"""

from __future__ import annotations

import html as html_mod
from string import Template

from newsletter.constants import (
    BRAND_NAME,
    BRAND_TAGLINE,
    COLOR_ACCENT,
    COLOR_BG,
    COLOR_CARD,
    COLOR_MUTED,
    COLOR_TEXT,
)
from newsletter.models import NewsletterContent
from newsletter.utils import domain_label

# 1080-wide; height grows to fit content (full_page screenshot)
PAGE_WIDTH = 1080
PAGE_HEIGHT = 1350  # initial viewport hint only — screenshot uses full_page=True

_PAGE_TMPL = Template("""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: ${width}px; background: ${bg};
         font-family: 'Helvetica Neue', Arial, sans-serif; color: ${text};
         display: flex; flex-direction: column; padding: 56px; }
  .brand { color: ${accent}; font-size: 30px; font-weight: 700; letter-spacing: 1px; }
  .tagline { color: ${muted}; font-size: 20px; margin-top: 6px; }
  h1 { font-size: 52px; line-height: 1.15; margin: 36px 0 18px; }
  .intro { font-size: 26px; color: ${muted}; line-height: 1.4; margin-bottom: 30px; }
  .item { background: ${card}; border-left: 6px solid ${accent};
          border-radius: 10px; padding: 22px 26px; margin-bottom: 20px; }
  .domain { color: ${accent}; font-size: 18px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 1px; }
  .headline { font-size: 28px; font-weight: 600; margin: 8px 0; line-height: 1.25; }
  .takeaway { font-size: 22px; color: ${muted}; line-height: 1.35; }
  .cta { margin-top: 36px; background: ${accent}; color: ${bg}; font-size: 26px;
         font-weight: 700; padding: 24px 30px; border-radius: 12px; text-align: center; }
</style></head>
<body>
  <div class="brand">${brand}</div>
  <div class="tagline">${tagline}</div>
  <h1>${title}</h1>
  <div class="intro">${intro}</div>
  ${items_html}
  <div class="cta">${cta}</div>
</body></html>""")

_ITEM_TMPL = Template(
    '<div class="item"><div class="domain">${domain}</div>'
    '<div class="headline">${headline}</div>'
    '<div class="takeaway">${takeaway}</div></div>'
)


def build_newsletter_html(content: NewsletterContent) -> str:
    """Render newsletter content into the branded one-pager HTML (escaped)."""
    if not isinstance(content, NewsletterContent):
        raise TypeError(
            f"build_newsletter_html requires NewsletterContent, got {type(content).__name__}"
        )

    items = [
        {
            "domain": domain_label(t.cpp_domain),
            "headline": t.theme_title,
            "takeaway": t.recommendation,
        }
        for t in content.themes[:5]
    ]
    title = content.title or ""
    intro = content.executive_summary or ""
    cta = content.cta_soft or "Is your organization prepared? Book a security audit."

    items_html = "".join(
        _ITEM_TMPL.substitute(
            domain=html_mod.escape(item.get("domain", "")),
            headline=html_mod.escape(item.get("headline", "")),
            takeaway=html_mod.escape(item.get("takeaway", "")),
        )
        for item in items
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
        title=html_mod.escape(title),
        intro=html_mod.escape(intro),
        items_html=items_html,
        cta=html_mod.escape(cta),
    )


async def render_png(html: str, *, width: int = PAGE_WIDTH, height: int = PAGE_HEIGHT) -> bytes:
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
