"""
Report findings engine — derives security findings from session events.
Pure functions: session events → classified findings ranked by severity.
"""

from answer_keywords import MODERATE_KEYWORDS, NEGATIVE_KEYWORDS
from config import CPP_DOMAINS, SEVERITY_ORDER

SEVERITY_CRITICAL = "critical"
SEVERITY_HIGH = "high"
SEVERITY_MEDIUM = "medium"
SEVERITY_LOW = "low"


def classify_severity(answer: str, is_trigger: bool) -> str:
    ans_lower = answer.lower().strip()
    if ans_lower in NEGATIVE_KEYWORDS:
        return SEVERITY_CRITICAL if is_trigger else SEVERITY_HIGH
    if ans_lower in MODERATE_KEYWORDS:
        return SEVERITY_HIGH if is_trigger else SEVERITY_MEDIUM
    return SEVERITY_LOW


def generate_findings(events: list[dict]) -> list[dict]:
    """Convert session events into ranked findings."""
    findings: list[dict] = []

    for event in events:
        answer = event.get("answer", "")
        if isinstance(answer, list):
            answer = ", ".join(answer)

        severity = classify_severity(answer, event.get("score_drop_trigger", False))
        if severity == SEVERITY_LOW:
            continue

        domain = event.get("domain", "")
        domain_name = CPP_DOMAINS.get(domain, domain)

        findings.append(
            {
                "domain": domain,
                "domain_name": domain_name,
                "question": event.get("question_text", ""),
                "answer": answer,
                "severity": severity,
                "recommendation": _generate_recommendation(event, severity),
            }
        )

    findings.sort(
        key=lambda f: (
            SEVERITY_ORDER.index(f["severity"])
            if f.get("severity") in SEVERITY_ORDER
            else len(SEVERITY_ORDER)
        )
    )
    return findings


def _generate_recommendation(event: dict, severity: str) -> str:
    """Generate a placeholder recommendation. AI-augmented in production."""
    domain = event.get("domain", "")
    if severity == SEVERITY_CRITICAL:
        return f"IMMEDIATE ACTION REQUIRED: Address {domain} gap identified."
    if severity == SEVERITY_HIGH:
        return f"HIGH PRIORITY: Review and remediate {domain} vulnerability."
    return f"Review {domain} posture and implement best practices."


def compute_urgency_score(findings: list[dict]) -> int:
    """0-100 urgency score based on severity distribution."""
    if not findings:
        return 0

    weights = {SEVERITY_CRITICAL: 25, SEVERITY_HIGH: 15, SEVERITY_MEDIUM: 5}
    raw_score = sum(weights.get(f["severity"], 0) for f in findings)
    return min(100, raw_score)


def compute_peer_benchmark(urgency_score: int) -> dict:
    """Synthetic peer benchmark until real aggregate data is available."""
    return {
        "user_score": urgency_score,
        "peer_average": 42,
        "percentile": max(1, min(99, 100 - urgency_score)),
        "interpretation": _benchmark_interpretation(urgency_score),
        "data_source": "synthetic_v1",
    }


def _benchmark_interpretation(score: int) -> str:
    if score >= 70:
        return "Your security posture has critical gaps requiring immediate attention."
    if score >= 40:
        return "Your security posture is below average. Several areas need improvement."
    return "Your security posture is above average but can still be strengthened."


def split_free_paid(findings: list[dict]) -> tuple[list[dict], list[dict]]:
    """Split findings: free summary shows all domains but blurs details."""
    free_findings: list[dict] = []
    paid_findings: list[dict] = [dict(f) for f in findings]

    for finding in findings:
        question = finding.get("question", "")
        free_findings.append(
            {
                "domain": finding.get("domain", ""),
                "domain_name": finding.get("domain_name", ""),
                "severity": finding.get("severity", "low"),
                "question": (
                    question[:60] + "..." if len(question) > 60 else question
                ),
                "answer": "●●●●●●",
                "recommendation": "Unlock full report for detailed recommendations.",
            }
        )

    return free_findings, paid_findings
