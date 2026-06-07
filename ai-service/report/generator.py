"""
Report generation orchestrator.
Builds structured ReportData for HNI (8 sections) and Enterprise (10 sections).
Async — calls Gemini for narrative augmentation via report.narrative.
"""

import asyncpg

from config import CPP_DOMAINS, TRACK_ENTERPRISE, TRACK_HNI, Settings
from gemini_client import GeminiClient
from report.compliance import generate_compliance_appendix
from report.constants import ENTERPRISE_SECTION_NAMES, HNI_SECTION_NAMES
from report.enrichment import (
    enrich_findings_with_cpp,
    enrich_findings_with_threat_intel,
)
from report.findings import (
    compute_peer_benchmark,
    compute_urgency_score,
    generate_findings,
    split_free_paid,
)
from report.narrative import (
    enhance_findings_with_ai,
    generate_board_summary,
    generate_executive_summary,
)
from report.schemas import Finding, FreeSummary, ReportData, ReportSection
from report.trending import compute_trend, format_trend_summary, get_user_session_history
from scoring import compute_radar_scores


async def generate_report_data(
    session: dict,
    *,
    gemini: GeminiClient | None = None,
    conn: asyncpg.Connection | None = None,
    settings: Settings | None = None,
) -> ReportData:
    """Main entry point: session dict -> validated ReportData."""
    events = session.get("events", [])
    track = session.get("track", TRACK_HNI)

    radar_scores = compute_radar_scores(events)
    raw_findings = generate_findings(events)
    urgency = compute_urgency_score(raw_findings)
    benchmark = compute_peer_benchmark(urgency)

    if gemini:
        enhanced_raw = await enhance_findings_with_ai(raw_findings, track, gemini=gemini)
    else:
        enhanced_raw = raw_findings

    threat_intel_articles: list[dict] = []
    if conn and gemini and settings:
        enhanced_raw = await enrich_findings_with_cpp(enhanced_raw, conn, settings, gemini=gemini)
        threat_intel_articles = await enrich_findings_with_threat_intel(enhanced_raw, conn)

    free_raw, paid_raw = split_free_paid(enhanced_raw)
    findings = [Finding(**f) for f in enhanced_raw]

    compliance_gaps = _count_compliance_gaps(enhanced_raw)

    exec_summary = None
    board_summary = None
    if gemini:
        exec_summary = await generate_executive_summary(
            enhanced_raw, track, gemini=gemini, radar_scores=radar_scores
        )
        if track == TRACK_ENTERPRISE:
            board_summary = await generate_board_summary(
                enhanced_raw,
                gemini=gemini,
                compliance_gap_count=compliance_gaps,
            )

    trend_summary: str | None = None
    user_id = session.get("user_id")
    if conn and user_id:
        history = await get_user_session_history(conn, user_id)
        if len(history) > 1:
            trend_data = compute_trend(history)
            trend_summary = format_trend_summary(trend_data)

    compliance_mappings = []
    if track == TRACK_ENTERPRISE and gemini:
        compliance_mappings = await generate_compliance_appendix(enhanced_raw, track, gemini=gemini)

    if track == TRACK_ENTERPRISE:
        sections = _build_enterprise_sections(
            radar_scores, enhanced_raw, paid_raw, urgency, benchmark, compliance_gaps
        )
    else:
        sections = _build_hni_sections(radar_scores, enhanced_raw, paid_raw, urgency, benchmark)

    free_summary = FreeSummary(
        urgency_score=urgency,
        domains_with_gaps=sorted({f.get("domain", "") for f in enhanced_raw if f.get("domain")}),
        findings_preview=free_raw[:5],
        peer_benchmark=benchmark,
        compliance_gap_count=compliance_gaps if track == TRACK_ENTERPRISE else None,
    )

    return ReportData(
        track=track,
        session_id=session.get("session_id", ""),
        findings=findings,
        sections=sections,
        urgency_score=urgency,
        peer_benchmark_percentile=benchmark.get("percentile", 50.0),
        compliance_gap_count=compliance_gaps if track == TRACK_ENTERPRISE else None,
        executive_summary=exec_summary,
        board_summary=board_summary,
        threat_intel_articles=threat_intel_articles,
        compliance_mappings=compliance_mappings,
        radar_scores=radar_scores,
        trend_summary=trend_summary,
        free_summary=free_summary,
    )


def _build_hni_sections(
    radar_scores: dict,
    findings: list[dict],
    paid_findings: list[dict],
    urgency: int,
    benchmark: dict,
) -> list[ReportSection]:
    data_map = {
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
        "recommendations": {"items": [f["recommendation"] for f in paid_findings]},
        "next_steps": {"items": _hni_next_steps(urgency)},
        "methodology": _methodology_section(),
    }
    return [ReportSection(name=name, data=data_map.get(name, {})) for name in HNI_SECTION_NAMES]


def _build_enterprise_sections(
    radar_scores: dict,
    findings: list[dict],
    paid_findings: list[dict],
    urgency: int,
    benchmark: dict,
    compliance_gaps: int,
) -> list[ReportSection]:
    data_map = {
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
        "recommendations": {"items": [f["recommendation"] for f in paid_findings]},
        "remediation_roadmap": _enterprise_roadmap(urgency, findings),
        "methodology": _methodology_section(),
    }
    return [
        ReportSection(name=name, data=data_map.get(name, {})) for name in ENTERPRISE_SECTION_NAMES
    ]


def _group_by_severity(findings: list[dict]) -> dict:
    groups: dict[str, list] = {"critical": [], "high": [], "medium": [], "low": []}
    for f in findings:
        sev = f.get("severity", "low")
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
