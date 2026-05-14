"""
AI narrative generation for audit reports.
Calls Gemini Pro for executive summaries, board summaries, and per-finding
recommendations. Falls back to rule-based text on any Gemini failure.
"""

import logging

from gemini_client import GeminiClient, GeminiError
from report.prompts import (
    BOARD_SUMMARY,
    EXECUTIVE_SUMMARY,
    FINDING_RECOMMENDATION,
    sanitize_for_prompt,
)

logger = logging.getLogger(__name__)

_PHYSICAL_DOMAINS = {"CPP-01", "CPP-06"}


async def generate_executive_summary(
    findings: list[dict],
    track: str,
    *,
    gemini: GeminiClient,
) -> str:
    """Generate an AI-written executive summary, or fall back to rule-based."""
    critical = [f for f in findings if f.get("severity") == "critical"]
    high = [f for f in findings if f.get("severity") == "high"]
    domains = sorted({f.get("domain", "") for f in findings})

    prompt = EXECUTIVE_SUMMARY.safe_substitute(
        track=track,
        total_findings=len(findings),
        critical_count=len(critical),
        high_count=len(high),
        domains_with_gaps=", ".join(domains) if domains else "None",
    )

    try:
        return await gemini.generate(prompt)
    except GeminiError:
        logger.warning("Gemini executive summary failed — using fallback")
        return _fallback_executive_summary(findings, track)


async def generate_board_summary(
    findings: list[dict],
    *,
    gemini: GeminiClient,
    compliance_gap_count: int = 0,
) -> str:
    """Generate an AI-written board-level summary for enterprise reports.
    compliance_gap_count must be passed from ReportData — not recomputed here."""
    critical = [f for f in findings if f.get("severity") == "critical"]
    domains = sorted({f.get("domain", "") for f in findings if f.get("domain")})

    prompt = BOARD_SUMMARY.safe_substitute(
        total_findings=len(findings),
        critical_count=len(critical),
        compliance_gap_count=compliance_gap_count,
        domains_with_gaps=", ".join(domains) if domains else "None",
    )

    try:
        return await gemini.generate(prompt)
    except GeminiError:
        logger.warning("Gemini board summary failed — using fallback")
        return _fallback_board_summary(findings)


async def generate_finding_recommendation(
    finding: dict,
    track: str,
    *,
    gemini: GeminiClient,
) -> str:
    """Generate an AI-written recommendation for a single finding."""
    prompt = FINDING_RECOMMENDATION.safe_substitute(
        track=track,
        domain=finding.get("domain", ""),
        domain_name=finding.get("domain_name", ""),
        question=sanitize_for_prompt(finding.get("question", "")),
        answer=sanitize_for_prompt(finding.get("answer", "")),
        severity=finding.get("severity", ""),
    )

    try:
        return await gemini.generate(prompt)
    except GeminiError:
        logger.warning("Gemini recommendation failed for %s", finding.get("domain"))
        return _fallback_recommendation(finding)


async def enhance_findings_with_ai(
    findings: list[dict],
    track: str,
    *,
    gemini: GeminiClient,
) -> list[dict]:
    """Return a new list of findings with AI-enhanced recommendations.
    Does not mutate the original findings list."""
    enhanced: list[dict] = []
    for finding in findings:
        copy = dict(finding)
        copy["recommendation"] = await generate_finding_recommendation(
            finding, track, gemini=gemini
        )
        copy["requires_physical_verification"] = (
            finding.get("domain", "") in _PHYSICAL_DOMAINS
        )
        enhanced.append(copy)
    return enhanced


def _fallback_executive_summary(findings: list[dict], track: str) -> str:
    critical_count = sum(1 for f in findings if f.get("severity") == "critical")
    total = len(findings)
    if critical_count > 0:
        return (
            f"This {track} security assessment identified {total} findings, "
            f"including {critical_count} critical gaps requiring immediate attention. "
            "A physical on-site audit is strongly recommended."
        )
    if total > 0:
        return (
            f"This {track} security assessment identified {total} findings. "
            "Review the recommendations below and consider scheduling a follow-up audit."
        )
    return f"This {track} security assessment found no significant gaps."


def _fallback_board_summary(findings: list[dict]) -> str:
    critical = sum(1 for f in findings if f.get("severity") == "critical")
    high = sum(1 for f in findings if f.get("severity") == "high")
    return (
        f"Enterprise security audit identified {critical} critical and {high} high-severity "
        f"findings across {len({f.get('domain') for f in findings})} CPP domains. "
        "Board review and remediation budget allocation recommended."
    )


def _fallback_recommendation(finding: dict) -> str:
    domain = finding.get("domain", "")
    severity = finding.get("severity", "")
    if severity == "critical":
        return f"IMMEDIATE ACTION REQUIRED: Address {domain} gap identified."
    if severity == "high":
        return f"HIGH PRIORITY: Review and remediate {domain} vulnerability."
    return f"Review {domain} posture and implement best practices."
