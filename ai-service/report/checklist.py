"""
On-site audit checklist generator.
Converts session findings into actionable checklist items grouped by CPP domain.
Pure function — no side effects, no DB calls.
"""

import hashlib
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
    IDs are stable — derived from domain + question text so they survive
    report regeneration and can be reliably matched against localStorage.
    Returns list of dicts (serialisable for JSON API response).
    """
    items: list[ChecklistItem] = []
    for finding in findings:
        severity = finding.get("severity", "low").lower()
        if severity not in ("critical", "high"):
            continue

        domain = finding.get("domain", "Unknown")
        question = finding.get("question", "")
        risk_impact = finding.get("risk_impact", "")
        action = _derive_action(question, risk_impact)
        reference = _build_reference(finding)
        stable_id = _stable_id(domain, question)

        items.append(
            ChecklistItem(
                id=stable_id,
                domain=domain,
                severity=severity,
                action=action,
                reference=reference,
            )
        )

    items.sort(key=lambda x: (_SEVERITY_ORDER.get(x.severity, 9), x.domain))
    return [asdict(item) for item in items]


def _stable_id(domain: str, question: str) -> str:
    """Derive a stable 8-char hex ID from domain + question text.

    Stable across report regenerations — allows localStorage progress keys
    to remain valid when a report is rebuilt without changing questions.
    """
    raw = f"{domain}:{question}".encode()
    return "chk_" + hashlib.sha256(raw).hexdigest()[:8]


def _derive_action(question: str, risk_impact: str) -> str:
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
