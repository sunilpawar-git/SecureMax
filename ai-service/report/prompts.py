"""
Prompt templates for Gemini report narrative generation.
Uses string.Template ($variable syntax) — immune to brace injection (S4).
Separated from Python logic so prompts are reviewable independently.
"""

from string import Template

EXECUTIVE_SUMMARY = Template(
    "You are a senior physical security consultant writing an executive summary "
    "for a $track security audit report based on the CPP Seven Precis framework.\n\n"
    "Assessment results:\n"
    "- Total findings: $total_findings\n"
    "- Critical: $critical_count\n"
    "- High: $high_count\n"
    "- Domains with gaps: $domains_with_gaps\n\n"
    "Write a concise 3-4 sentence executive summary. "
    "If critical findings exist, use urgent language. "
    "Reference specific CPP domains. Do not use markdown."
)

BOARD_SUMMARY = Template(
    "You are a security advisor preparing a board-level briefing for an enterprise "
    "security audit based on the CPP Seven Precis framework.\n\n"
    "Assessment results:\n"
    "- Total findings: $total_findings\n"
    "- Critical: $critical_count\n"
    "- Compliance gaps: $compliance_gap_count\n"
    "- Domains with gaps: $domains_with_gaps\n\n"
    "Write a 3-4 sentence executive board summary covering:\n"
    "1. Overall risk exposure\n"
    "2. Liability and insurance implications\n"
    "3. Recommended immediate board action\n"
    "Use formal business language. Do not use markdown."
)

FINDING_RECOMMENDATION = Template(
    "You are a CPP-certified physical security consultant.\n\n"
    "A $track security audit found the following issue:\n"
    "- CPP Domain: $domain ($domain_name)\n"
    "- Question: $question\n"
    "- Answer: $answer\n"
    "- Severity: $severity\n\n"
    "Write a specific, actionable 2-3 sentence recommendation that:\n"
    "1. References the CPP domain standard\n"
    "2. Provides a concrete remediation step\n"
    "3. Mentions verification method if applicable\n"
    "Do not use markdown."
)

COMPLIANCE_MAPPING = Template(
    "You are a compliance analyst mapping physical security audit findings "
    "to ISO 27001 Annex A and India's PSARA 2005 framework.\n\n"
    "Finding details:\n"
    "- CPP Domain: $domain ($domain_name)\n"
    "- Issue: $question\n"
    "- Severity: $severity\n\n"
    "Return ONLY a JSON object with exactly these keys:\n"
    '- "iso_clause": the most relevant ISO 27001 Annex A clause '
    '(e.g. "A.11.1.1 Physical security perimeter")\n'
    '- "psara_section": the most relevant PSARA 2005 section '
    '(e.g. "Section 10 — Duties of private security agency")\n'
    '- "remediation_owner_role": the corporate role responsible '
    '(e.g. "Facility Security Manager")\n\n'
    "No markdown, no explanation — only the JSON object."
)

_MAX_ANSWER_LENGTH = 500


def sanitize_for_prompt(text: str) -> str:
    """Strip control characters and truncate to safe length."""
    cleaned = "".join(c for c in text if c.isprintable() or c in ("\n", "\t"))
    if len(cleaned) > _MAX_ANSWER_LENGTH:
        return cleaned[:_MAX_ANSWER_LENGTH] + "..."
    return cleaned
