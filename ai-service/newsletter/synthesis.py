"""
Newsletter content synthesis from threat intel articles.
Gemini provides judgment (themes, takeaways — Rule 5); parsing and the
deterministic fallback are code. GeminiError never propagates: the fallback
cites the real articles so the newsletter is always grounded in actual intel
(Rule 13: CPP domains carried through from article tags).
"""

import json
import logging
import re

from gemini_client import GeminiError

logger = logging.getLogger(__name__)

_MAX_ITEMS = 5
_FENCE_RE = re.compile(r"^```[a-z]*\n?|\n?```$")

_PROMPT_TEMPLATE = (
    "You are the editor of a one-page weekly physical security newsletter for "
    "Raivan Global Security Consulting (audience: facility managers and HNIs in India).\n\n"
    "This period's threat intelligence:\n{articles}\n\n"
    "Return ONLY JSON with this exact shape:\n"
    '{{"title": "catchy issue title, max 60 chars",\n'
    '  "intro": "1-2 sentence hook, max 200 chars",\n'
    '  "items": [{{"headline": "max 80 chars", "takeaway": "actionable advice, max 160 chars", '
    '"domain": "the CPP-XX tag"}}],\n'
    '  "cta": "1 sentence inviting a professional security audit, max 120 chars"}}\n\n'
    f"Use at most {_MAX_ITEMS} items. Professional, non-alarmist tone. No markdown."
)


async def synthesize_newsletter(articles: list[dict], *, gemini) -> dict:
    """Return newsletter content: title, intro, items[], cta.

    Falls back to a deterministic digest of the supplied articles when Gemini
    fails — the result is always grounded in real intel.
    """
    article_text = "\n".join(
        f"- {a.get('title', 'Untitled')} ({', '.join(a.get('domain_tags', []))}): "
        f"{a.get('summary', '')[:200]}"
        for a in articles[:_MAX_ITEMS * 2]
    )
    prompt = _PROMPT_TEMPLATE.format(articles=article_text)

    try:
        raw = await gemini.generate(prompt)
        parsed = json.loads(_FENCE_RE.sub("", raw.strip()).strip())
        items = [
            {
                "headline": str(i.get("headline", ""))[:80],
                "takeaway": str(i.get("takeaway", ""))[:160],
                "domain": str(i.get("domain", "")),
            }
            for i in parsed.get("items", [])[:_MAX_ITEMS]
        ]
        if not parsed.get("title") or not items:
            raise ValueError("Gemini returned incomplete newsletter JSON")
        return {
            "title": str(parsed["title"])[:60],
            "intro": str(parsed.get("intro", ""))[:200],
            "items": items,
            "cta": str(parsed.get("cta", ""))[:120],
        }
    except (GeminiError, ValueError, json.JSONDecodeError, TypeError) as e:
        logger.warning("Newsletter synthesis failed — using deterministic fallback: %s", e)
        return _fallback_content(articles)


def _fallback_content(articles: list[dict]) -> dict:
    """Deterministic digest citing the actual articles (no AI judgment)."""
    items = [
        {
            "headline": str(a.get("title", "Untitled"))[:80],
            "takeaway": str(a.get("summary", ""))[:160],
            "domain": ", ".join(a.get("domain_tags", [])[:2]),
        }
        for a in articles[:_MAX_ITEMS]
    ]
    return {
        "title": "Security Threat Digest",
        "intro": f"{len(articles)} incidents tracked across our monitored sources this period.",
        "items": items,
        "cta": "Is your organization prepared? Book a professional security audit.",
    }
