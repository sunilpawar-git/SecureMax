"""
Multi-dimension intelligence scoring for newsletter quality gating.
Gemini Flash scores articles on 6 dimensions (Rule 5: judgment);
fallback_scores() provides keyword-based deterministic scoring.
"""

import json
import logging
import re
from string import Template

from newsletter.constants import INTEL_SCORE_WEIGHTS, NEWSLETTER_QUALITY_THRESHOLD
from scraper.models import IntelScores, RawArticle

logger = logging.getLogger(__name__)

_FENCE_RE = re.compile(r"^```[a-z]*\n?|\n?```$")

_INDIA_TERMS = frozenset({
    "india", "indian", "delhi", "mumbai", "bangalore", "bengaluru",
    "hyderabad", "chennai", "kolkata", "pune", "ahmedabad", "jaipur",
    "lucknow", "gurgaon", "noida", "gated community", "housing society",
    "cisf", "crpf", "private security guard", "watchman",
})

_PHYSICAL_SECURITY_TERMS = frozenset({
    "physical security", "cctv", "access control", "perimeter",
    "surveillance", "guard", "patrol", "intrusion", "break-in",
    "burglary", "theft", "trespassing", "fire safety",
    "emergency response", "security breach", "security incident",
    "workplace violence", "insider threat",
})

_ACTION_VERBS = frozenset({
    "review", "audit", "update", "check", "verify", "ensure",
    "implement", "deploy", "install", "train", "assess", "test",
    "monitor", "upgrade", "replace", "inspect",
})

_SCORING_PROMPT = Template(
    "You are an intelligence analyst scoring a security news article "
    "for a weekly physical security newsletter targeting Indian audiences "
    "(HNIs, enterprises, critical infrastructure operators).\n\n"
    "Article:\nTitle: $title\nContent: $content\n\n"
    "Score each dimension from 0.0 to 1.0:\n"
    "- physical_security_relevance: Is this about PHYSICAL security "
    "(not purely cybersecurity)?\n"
    "- geographic_relevance: Is this India-specific or directly "
    "applicable to Indian security context?\n"
    "- threat_actionability: Can a facility manager or security head "
    "take concrete action based on this?\n"
    "- educational_value: Does this teach a security principle or "
    "expose a vulnerability pattern?\n"
    "- recency_novelty: Is this genuinely new information?\n"
    "- audience_impact: How broadly does this affect our audience?\n\n"
    'Also provide affected_segments from: ["hni", "enterprise", '
    '"critical_infrastructure"]\n\n'
    "Return ONLY valid JSON (no markdown fences):\n"
    '{"physical_security_relevance": 0.8, '
    '"geographic_relevance": 0.7, '
    '"threat_actionability": 0.6, '
    '"educational_value": 0.5, '
    '"recency_novelty": 0.9, '
    '"audience_impact": 0.7, '
    '"affected_segments": ["enterprise"]}'
)


def compute_composite_score(scores: IntelScores) -> float:
    """Weighted sum of all scoring dimensions."""
    total = 0.0
    for dim, weight in INTEL_SCORE_WEIGHTS.items():
        total += getattr(scores, dim) * weight
    return round(total, 4)


def passes_quality_gate(scores: IntelScores) -> bool:
    """True if the article's composite score meets the newsletter threshold."""
    return compute_composite_score(scores) >= NEWSLETTER_QUALITY_THRESHOLD


async def score_article(article: RawArticle, *, gemini) -> IntelScores:
    """Score an article via Gemini Flash. Falls back to keywords on failure."""
    prompt = _SCORING_PROMPT.safe_substitute(
        title=article.title,
        content=article.content[:800],
    )
    try:
        raw = await gemini.generate(prompt)
        cleaned = _FENCE_RE.sub("", raw.strip()).strip()
        parsed = json.loads(cleaned)
        return IntelScores(**parsed)
    except Exception as e:
        logger.warning("Gemini scoring failed for %s: %s", article.url, e)
        return fallback_scores(article)


def fallback_scores(article: RawArticle) -> IntelScores:
    """Keyword-based deterministic scoring when Gemini is unavailable."""
    text = f"{article.title} {article.content}".lower()
    words = set(text.split())

    phys_hits = sum(1 for t in _PHYSICAL_SECURITY_TERMS if t in text)
    phys_score = min(phys_hits * 0.15, 1.0)

    india_hits = sum(1 for t in _INDIA_TERMS if t in text)
    geo_score = min(india_hits * 0.25, 1.0)

    action_hits = sum(1 for v in _ACTION_VERBS if v in words)
    action_score = min(action_hits * 0.2, 1.0)

    edu_score = min(len(text) / 2000, 1.0) * 0.5 + phys_score * 0.5

    segments: list[str] = []
    if any(t in text for t in ("residence", "estate", "hni", "home", "family")):
        segments.append("hni")
    if any(t in text for t in ("corporate", "office", "campus", "enterprise")):
        segments.append("enterprise")
    if any(t in text for t in ("infrastructure", "power", "telecom", "data centre")):
        segments.append("critical_infrastructure")

    return IntelScores(
        physical_security_relevance=phys_score,
        geographic_relevance=geo_score,
        threat_actionability=action_score,
        educational_value=min(edu_score, 1.0),
        recency_novelty=1.0,
        audience_impact=0.5 if segments else 0.3,
        affected_segments=segments,
    )
