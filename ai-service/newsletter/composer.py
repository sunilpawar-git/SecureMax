"""
Pass 3 — Compose & Voice: generate tiered newsletter content with editorial voice.
Produces executive summary (LinkedIn/WhatsApp), intelligence briefing (email),
and full analysis (website).
"""

import json
import logging
import re
from datetime import UTC, datetime

from newsletter.constants import BRAND_SIGN_OFF
from newsletter.models import EnrichedTheme, NewsletterContent, SegmentImpact
from newsletter.prompts import COMPOSE_PROMPT

logger = logging.getLogger(__name__)

_FENCE_RE = re.compile(r"^```[a-z]*\n?|\n?```$")


async def compose_newsletter(
    themes: list[EnrichedTheme],
    *,
    gemini,
) -> NewsletterContent:
    """Compose the final tiered newsletter from enriched themes."""
    themes_json = json.dumps(
        [t.model_dump(mode="json") for t in themes], indent=2
    )
    prompt = COMPOSE_PROMPT.safe_substitute(themes_json=themes_json)

    try:
        raw = await gemini.generate(prompt)
        cleaned = _FENCE_RE.sub("", raw.strip()).strip()
        parsed = json.loads(cleaned)

        return NewsletterContent(
            title=parsed["title"][:80],
            issue_date=datetime.now(UTC).strftime("%d %B %Y"),
            executive_summary=parsed["executive_summary"],
            intelligence_briefing=parsed["intelligence_briefing"],
            full_analysis=parsed["full_analysis"],
            commanders_note=parsed.get("commanders_note", ""),
            cta_soft=parsed.get("cta_soft", ""),
            cta_audit_link="/security-audit",
            themes=themes,
        )
    except Exception as e:
        logger.warning("Gemini composition failed: %s — using fallback", e)
        return fallback_compose(themes)


def fallback_compose(themes: list[EnrichedTheme]) -> NewsletterContent:
    """Deterministic composition from enriched themes when Gemini fails."""
    title = f"Weekly Security Intelligence — {datetime.now(UTC).strftime('%d %B %Y')}"
    issue_date = datetime.now(UTC).strftime("%d %B %Y")

    exec_parts = [f"This week's intelligence covers {len(themes)} key security development(s)."]
    briefing_parts = []
    analysis_parts = []

    for i, theme in enumerate(themes, 1):
        exec_parts.append(f"{i}. {theme.theme_title}: {theme.situation}")

        briefing_parts.append(
            f"## {theme.theme_title} ({theme.cpp_domain})\n\n"
            f"**Situation:** {theme.situation}\n\n"
            f"**Assessment:** {theme.assessment}\n\n"
            f"**Recommendation:** {theme.recommendation}"
        )

        seg = theme.segment_impact or SegmentImpact()
        analysis_parts.append(
            f"## {theme.theme_title}\n\n"
            f"**Situation:** {theme.situation}\n\n"
            f"**Assessment:** {theme.assessment}\n\n"
            f"**Implications:** {theme.implications}\n\n"
            f"**Recommendation:** {theme.recommendation}\n\n"
            f"**CPP Citation:** {theme.cpp_citation or theme.cpp_domain}\n\n"
            f"### Segment Impact\n"
            f"- Private Residences: {seg.hni or 'Review recommended'}\n"
            f"- Corporates: {seg.enterprise or 'Review recommended'}\n"
            f"- Critical Infrastructure: "
            f"{seg.critical_infrastructure or 'Review recommended'}"
        )

    return NewsletterContent(
        title=title,
        issue_date=issue_date,
        executive_summary="\n".join(exec_parts) + f"\n\n{BRAND_SIGN_OFF}",
        intelligence_briefing="\n\n---\n\n".join(briefing_parts),
        full_analysis="\n\n---\n\n".join(analysis_parts),
        cta_soft="Is your organization prepared? Book a professional security audit.",
        cta_audit_link="/security-audit",
        themes=themes,
    )
