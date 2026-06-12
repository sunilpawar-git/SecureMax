"""
WhatsApp text renderer — plain-text formatted for WhatsApp sharing.
Uses WhatsApp bold (*text*) and italic (_text_) formatting.
"""

from newsletter.constants import BRAND_NAME, BRAND_SIGN_OFF
from newsletter.models import NewsletterContent
from newsletter.utils import domain_label


def render_whatsapp_text(content: NewsletterContent) -> str:
    """Render the executive summary tier as WhatsApp-formatted text."""
    lines = [
        f"*{BRAND_NAME} — Weekly Security Intelligence*",
        f"_{content.issue_date}_",
        "",
        f"*{content.title}*",
        "",
        content.executive_summary[:500],
        "",
    ]

    for i, theme in enumerate(content.themes[:3], 1):
        lines.append(f"{i}. *{theme.theme_title}* ({domain_label(theme.cpp_domain)})")
        lines.append(f"   {theme.situation}")
        if theme.recommendation:
            lines.append(f"   _Action: {theme.recommendation}_")
        lines.append("")

    if content.cta_soft:
        lines.append(f"_{content.cta_soft}_")
        lines.append("")

    lines.append(f"_{BRAND_SIGN_OFF}_")

    result = "\n".join(lines)
    if len(result) > 4000:
        result = result[:3997] + "…"
    return result
