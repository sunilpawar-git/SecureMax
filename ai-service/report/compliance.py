"""
Compliance appendix generation for enterprise reports.
Maps findings to ISO 27001 Annex A.11 and PSARA clauses.
Uses Gemini structured output with deterministic fallback per CPP domain.
"""

import json
import logging

from config import TRACK_HNI
from gemini_client import GeminiClient, GeminiError
from report.prompts import COMPLIANCE_MAPPING, sanitize_for_prompt
from report.schemas import ComplianceMapping

logger = logging.getLogger(__name__)

COMPLIANCE_FALLBACK_MAP: dict[str, dict[str, str]] = {
    "CPP-01": {
        "iso_clause": "A.11.1.1 Physical security perimeter",
        "psara_section": "Section 10 — Duties of private security agency",
        "remediation_owner_role": "Facility Security Manager",
    },
    "CPP-02": {
        "iso_clause": "A.5.1.1 Policies for information security",
        "psara_section": "Section 14 — Conditions of licence",
        "remediation_owner_role": "Chief Risk Officer",
    },
    "CPP-03": {
        "iso_clause": "A.17.1.1 Planning information security continuity",
        "psara_section": "Section 10 — Emergency preparedness",
        "remediation_owner_role": "Crisis Management Lead",
    },
    "CPP-04": {
        "iso_clause": "A.16.1.5 Response to information security incidents",
        "psara_section": "Section 11 — Investigation conduct",
        "remediation_owner_role": "Chief Security Officer",
    },
    "CPP-05": {
        "iso_clause": "A.8.2.3 Handling of assets",
        "psara_section": "Section 10 — Information protection duties",
        "remediation_owner_role": "Information Security Manager",
    },
    "CPP-06": {
        "iso_clause": "A.7.1.1 Screening",
        "psara_section": "Section 6 — Eligibility for private security guards",
        "remediation_owner_role": "Personnel Security Lead",
    },
    "CPP-07": {
        "iso_clause": "A.18.2.1 Independent review of information security",
        "psara_section": "Section 24 — Regulation of security agencies",
        "remediation_owner_role": "Security Governance Director",
    },
}


async def generate_compliance_appendix(
    findings: list[dict],
    track: str,
    *,
    gemini: GeminiClient,
) -> list[ComplianceMapping]:
    """Generate compliance mappings for each finding.
    Returns empty list for HNI track."""
    if track == TRACK_HNI or not findings:
        return []

    mappings: list[ComplianceMapping] = []
    for finding in findings:
        mapping = await _map_single_finding(finding, gemini)
        mappings.append(mapping)
    return mappings


async def _map_single_finding(
    finding: dict,
    gemini: GeminiClient,
) -> ComplianceMapping:
    """Try Gemini structured output, fall back to deterministic map."""
    domain = finding.get("domain", "")

    prompt = COMPLIANCE_MAPPING.safe_substitute(
        domain=domain,
        domain_name=finding.get("domain_name", ""),
        question=sanitize_for_prompt(finding.get("question", "")),
        severity=finding.get("severity", ""),
    )

    try:
        raw = await gemini.generate(prompt)
        parsed = json.loads(raw)
        return ComplianceMapping(
            finding_domain=domain,
            iso_clause=parsed["iso_clause"],
            psara_section=parsed["psara_section"],
            remediation_owner_role=parsed["remediation_owner_role"],
        )
    except (GeminiError, json.JSONDecodeError, KeyError, TypeError):
        logger.warning(
            "Gemini compliance mapping failed for %s — using fallback",
            domain,
        )
        return _fallback_mapping(domain)


_UNKNOWN_MAPPING = {
    "iso_clause": "Unknown",
    "psara_section": "Unknown",
    "remediation_owner_role": "Security Governance Director",
}


def _fallback_mapping(domain: str) -> ComplianceMapping:
    """Deterministic fallback from the exhaustive CPP domain map.
    Unknown domains receive an explicit 'Unknown' mapping rather than
    silently inheriting CPP-07, preventing mis-labelled compliance entries."""
    entry = COMPLIANCE_FALLBACK_MAP.get(domain, _UNKNOWN_MAPPING)
    return ComplianceMapping(
        finding_domain=domain,
        iso_clause=entry["iso_clause"],
        psara_section=entry["psara_section"],
        remediation_owner_role=entry["remediation_owner_role"],
    )
