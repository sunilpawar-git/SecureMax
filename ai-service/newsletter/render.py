"""
One-pager rendering: newsletter content → branded HTML → PNG via Playwright.
build_newsletter_html() is pure (testable without a browser); render_png()
needs Chromium (already a project dependency via the scraper).

All article-derived text is HTML-escaped — scraped content is untrusted input.
"""

import html as html_mod
from string import Template

# 1080x1350 (4:5 portrait) — Instagram-safe, fine on LinkedIn/X/Facebook
PAGE_WIDTH = 1080
PAGE_HEIGHT = 1350

# Brand palette (mirrors the web app's slate/amber scheme)
_COLOR_BG = "#0f172a"
_COLOR_CARD = "#1e293b"
_COLOR_TEXT = "#f1f5f9"
_COLOR_MUTED = "#94a3b8"
_COLOR_ACCENT = "#f59e0b"

_BRAND_NAME = "Raivan Global"
_BRAND_TAGLINE = "Security Consulting — Weekly Threat Intelligence"

_PAGE_TMPL = Template("""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: ${width}px; height: ${height}px; background: ${bg};
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
  .cta { margin-top: auto; background: ${accent}; color: ${bg}; font-size: 26px;
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


def build_newsletter_html(content: dict) -> str:
    """Render newsletter content into the branded one-pager HTML (escaped)."""
    items_html = "".join(
        _ITEM_TMPL.substitute(
            domain=html_mod.escape(item.get("domain", "")),
            headline=html_mod.escape(item.get("headline", "")),
            takeaway=html_mod.escape(item.get("takeaway", "")),
        )
        for item in content.get("items", [])
    )
    return _PAGE_TMPL.substitute(
        width=PAGE_WIDTH,
        height=PAGE_HEIGHT,
        bg=_COLOR_BG,
        card=_COLOR_CARD,
        text=_COLOR_TEXT,
        muted=_COLOR_MUTED,
        accent=_COLOR_ACCENT,
        brand=html_mod.escape(_BRAND_NAME),
        tagline=html_mod.escape(_BRAND_TAGLINE),
        title=html_mod.escape(content.get("title", "")),
        intro=html_mod.escape(content.get("intro", "")),
        items_html=items_html,
        cta=html_mod.escape(content.get("cta", "")),
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
            return await page.screenshot(type="png")
        finally:
            await browser.close()
