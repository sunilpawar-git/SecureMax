"""
On-site audit checklist generator.
Converts session findings into actionable checklist items grouped by CPP domain.
Pure function — no side effects, no DB calls.
"""

from dataclasses import asdict, dataclass

_SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


@dataclass(frozen=True)
class ChecklistItem:
    id: str
    domain: str
    severity: str
    action: str
    reference: str
    checked: bool = False


def generate_checklist(findings: list[dict]) -> list[dict]:
    """Generate a structured checklist from report findings.

    Only high/critical findings produce checklist items.
    Items are sorted by severity (critical first), then by domain.
    Returns list of dicts (serialisable for JSON API response).
    """
    items: list[ChecklistItem] = []
    for i, finding in enumerate(findings):
        severity = finding.get("severity", "low").lower()
        if severity not in ("critical", "high"):
            continue

        domain = finding.get("domain", "Unknown")
        question = finding.get("question", "")
        risk_impact = finding.get("risk_impact", "")
        action = _derive_action(question, risk_impact, finding.get("answer", ""))
        reference = _build_reference(finding)

        items.append(
            ChecklistItem(
                id=f"chk_{i:03d}_{domain.lower().replace('-', '')}",
                domain=domain,
                severity=severity,
                action=action,
                reference=reference,
            )
        )

    items.sort(key=lambda x: (_SEVERITY_ORDER.get(x.severity, 9), x.domain))
    return [asdict(item) for item in items]


def _derive_action(question: str, risk_impact: str, answer: str) -> str:
    """Create an actionable checklist instruction from the finding context."""
    if risk_impact:
        return f"VERIFY: {risk_impact.rstrip('.')}"
    if question:
        return f"INSPECT: {question.rstrip('?')}"
    return "REVIEW: Confirm security control is operational"


def _build_reference(finding: dict) -> str:
    """Build a CPP citation reference string."""
    domain = finding.get("domain", "")
    cpp_cite = finding.get("cpp_citation", {})
    section = cpp_cite.get("section", "")
    if section:
        return f"{domain} — {section}"
    return domain
