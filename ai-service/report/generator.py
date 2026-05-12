"""
Report generation orchestrator.
Builds structured report data for HNI (8 sections) and Enterprise (10 sections).
Actual PDF rendering happens via Playwright HTML→PDF (separate service call).
"""

from config import CPP_DOMAINS, TRACK_ENTERPRISE, TRACK_HNI
from report.findings import (
    compute_peer_benchmark,
    compute_urgency_score,
    generate_findings,
    split_free_paid,
)
from scoring import compute_radar_scores


def generate_report_data(session: dict) -> dict:
    """Main entry point: session → complete report data structure."""
    events = session.get("events", [])
    track = session.get("track", TRACK_HNI)

    radar_scores = compute_radar_scores(events)
    findings = generate_findings(events)
    urgency = compute_urgency_score(findings)
    benchmark = compute_peer_benchmark(urgency)
    free_findings, paid_findings = split_free_paid(findings)

    compliance_gaps = _count_compliance_gaps(findings)

    if track == TRACK_ENTERPRISE:
        return _build_enterprise_report(
            session,
            radar_scores,
            findings,
            paid_findings,
            free_findings,
            urgency,
            benchmark,
            compliance_gaps,
        )
    return _build_hni_report(
        session,
        radar_scores,
        findings,
        paid_findings,
        free_findings,
        urgency,
        benchmark,
    )


def _build_hni_report(
    session: dict,
    radar_scores: dict,
    findings: list[dict],
    paid_findings: list[dict],
    free_findings: list[dict],
    urgency: int,
    benchmark: dict,
) -> dict:
    """HNI report: 8 sections."""
    return {
        "type": "hni",
        "session_id": session.get("session_id", ""),
        "sections": {
            "executive_summary": {
                "urgency_score": urgency,
                "total_findings": len(findings),
                "critical_count": sum(1 for f in findings if f["severity"] == "critical"),
                "domains_assessed": list(CPP_DOMAINS.keys()),
            },
            "radar_scores": radar_scores,
            "peer_benchmark": benchmark,
            "findings_by_severity": _group_by_severity(paid_findings),
            "domain_breakdown": _group_by_domain(paid_findings),
            "recommendations": [f["recommendation"] for f in paid_findings],
            "next_steps": _hni_next_steps(urgency),
            "methodology": _methodology_section(),
        },
        "free_summary": {
            "urgency_score": urgency,
            "findings_preview": free_findings[:5],
            "domains_with_gaps": list({f["domain"] for f in findings}),
            "peer_benchmark": benchmark,
        },
    }


def _build_enterprise_report(
    session: dict,
    radar_scores: dict,
    findings: list[dict],
    paid_findings: list[dict],
    free_findings: list[dict],
    urgency: int,
    benchmark: dict,
    compliance_gaps: int,
) -> dict:
    """Enterprise report: 10 sections (adds compliance + board summary)."""
    return {
        "type": "enterprise",
        "session_id": session.get("session_id", ""),
        "sections": {
            "board_executive_summary": {
                "urgency_score": urgency,
                "compliance_gap_count": compliance_gaps,
                "total_findings": len(findings),
                "critical_count": sum(1 for f in findings if f["severity"] == "critical"),
            },
            "radar_scores": radar_scores,
            "peer_benchmark": benchmark,
            "compliance_gap_analysis": _compliance_section(findings),
            "findings_by_severity": _group_by_severity(paid_findings),
            "domain_breakdown": _group_by_domain(paid_findings),
            "module_findings": _group_by_module(findings),
            "recommendations": [f["recommendation"] for f in paid_findings],
            "remediation_roadmap": _enterprise_roadmap(urgency, findings),
            "methodology": _methodology_section(),
        },
        "free_summary": {
            "urgency_score": urgency,
            "compliance_gap_count": compliance_gaps,
            "findings_preview": free_findings[:5],
            "domains_with_gaps": list({f["domain"] for f in findings}),
            "peer_benchmark": benchmark,
        },
    }


def _group_by_severity(findings: list[dict]) -> dict:
    groups: dict[str, list] = {"critical": [], "high": [], "medium": []}
    for f in findings:
        sev = f["severity"]
        if sev in groups:
            groups[sev].append(f)
    return groups


def _group_by_domain(findings: list[dict]) -> dict:
    groups: dict[str, list] = {}
    for f in findings:
        groups.setdefault(f["domain"], []).append(f)
    return groups


def _group_by_module(findings: list[dict]) -> dict:
    groups: dict[str, list] = {}
    for f in findings:
        module = f.get("module_tag", "general")
        groups.setdefault(module, []).append(f)
    return groups


def _count_compliance_gaps(findings: list[dict]) -> int:
    return sum(1 for f in findings if f["severity"] in ("critical", "high"))


def _compliance_section(findings: list[dict]) -> dict:
    gaps = [f for f in findings if f["severity"] in ("critical", "high")]
    return {
        "gap_count": len(gaps),
        "affected_domains": list({f["domain"] for f in gaps}),
        "gaps": gaps[:10],
    }


def _hni_next_steps(urgency: int) -> list[str]:
    steps = ["Download your full security report"]
    if urgency >= 50:
        steps.append("Book a physical security audit via WhatsApp")
        steps.append("Schedule a consultation with our security expert")
    else:
        steps.append("Review recommendations at your convenience")
        steps.append("Consider a periodic security review")
    return steps


def _enterprise_roadmap(urgency: int, findings: list[dict]) -> dict:
    critical = [f for f in findings if f["severity"] == "critical"]
    return {
        "immediate_actions": [f["recommendation"] for f in critical[:3]],
        "30_day_plan": "Address all critical and high-severity findings.",
        "90_day_plan": "Implement recurring review cycle and staff training.",
        "annual_review": "Schedule next comprehensive audit.",
    }


def _methodology_section() -> dict:
    return {
        "framework": "CPP Seven Precis",
        "domains_assessed": 7,
        "standard": "Aligned with ISO 27001, PSARA, and ESRM methodology",
    }
