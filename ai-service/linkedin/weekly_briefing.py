"""
Weekly security briefing synthesis for LinkedIn posting.
Aggregates recent threat intelligence articles and produces a concise,
authoritative security briefing suitable for LinkedIn.
"""

import logging
from string import Template

from gemini_client import GeminiClient, GeminiError

logger = logging.getLogger(__name__)

_MAX_CHARS = 3000

_BRIEFING_PROMPT = Template(
    "You are a Chief Security Advisor writing a weekly LinkedIn security briefing "
    "for physical security professionals in India.\n\n"
    "This week's intelligence articles:\n$articles\n\n"
    "Write a concise briefing (under 2800 characters) that:\n"
    "1. Opens with a single-sentence hook about this week's security landscape\n"
    "2. Summarises 2-3 key themes from the articles, citing specific incidents\n"
    "3. Provides 1-2 actionable takeaways for security managers\n"
    "4. Ends with a professional sign-off\n\n"
    "Tone: authoritative, informative, professional. "
    "Include relevant hashtags (max 5). "
    "Do not use markdown. Do not use bullet points."
)

_NO_ARTICLES_FALLBACK = (
    "Weekly Security Briefing: No significant physical security incidents "
    "were reported in our monitored sources this week. This is a reminder "
    "that quiet periods are ideal for proactive security reviews — assess "
    "your perimeter, test your emergency plans, and verify guard training "
    "is up to date. Stay vigilant.\n\n#PhysicalSecurity #SecurityManagement"
)


async def synthesize_weekly_briefing(
    articles: list[dict],
    *,
    gemini: GeminiClient,
) -> str:
    """Synthesize a weekly LinkedIn briefing from threat intel articles.

    Returns a string under 3000 characters, suitable for direct LinkedIn posting.
    Falls back to a generic briefing if Gemini fails or no articles exist.
    """
    if not articles:
        return _NO_ARTICLES_FALLBACK

    article_text = "\n".join(
        f"- {a.get('title', 'Untitled')} ({', '.join(a.get('domain_tags', []))}): "
        f"{a.get('summary', '')[:200]}"
        for a in articles[:10]
    )

    prompt = _BRIEFING_PROMPT.safe_substitute(articles=article_text)

    try:
        result = await gemini.generate(prompt)
        if len(result) > _MAX_CHARS:
            result = result[:_MAX_CHARS - 3] + "..."
        return result
    except GeminiError:
        logger.warning("Gemini briefing synthesis failed — using fallback")
        return _build_fallback_briefing(articles)


def _build_fallback_briefing(articles: list[dict]) -> str:
    """Rule-based fallback when Gemini is unavailable."""
    titles = [a.get("title", "Untitled") for a in articles[:3]]
    domains = sorted({tag for a in articles for tag in a.get("domain_tags", [])})

    return (
        f"Weekly Security Briefing: {len(articles)} incidents tracked this week "
        f"across {', '.join(domains[:3]) or 'multiple'} domains. "
        f"Key events: {'; '.join(titles)}. "
        "Review your security posture and ensure teams are briefed on emerging threats."
        "\n\n#PhysicalSecurity #ThreatIntel #SecurityManagement"
    )
