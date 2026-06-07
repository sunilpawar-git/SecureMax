"""
Prompt templates for Gemini report narrative generation.
Uses string.Template ($variable syntax) — immune to brace injection (S4).
Separated from Python logic so prompts are reviewable independently.
"""

from string import Template

EXECUTIVE_SUMMARY = Template(
    "You are a Principal Security Consultant at a global risk advisory firm, "
    "writing the executive summary for a $track physical security audit report "
    "based on the CPP Seven Precis framework.\n\n"
    "Assessment data:\n"
    "- Total findings: $total_findings\n"
    "- Critical findings: $critical_count\n"
    "- High-severity findings: $high_count\n"
    "- CPP domains with identified gaps: $domains_with_gaps\n"
    "- Worst-performing domain: $worst_domain (score: $worst_domain_score/100)\n\n"
    "Write exactly 3 paragraphs:\n"
    "1. Overall security posture assessment with quantified risk exposure\n"
    "2. Critical gaps with specific business impact (asset loss, liability, "
    "regulatory exposure)\n"
    "3. Recommended immediate actions prioritised by risk reduction value\n\n"
    "Tone: authoritative, quantified, board-readable. "
    "Reference specific CPP domains by code (e.g. CPP-01). "
    "Do not use markdown formatting. Do not use bullet points."
)

BOARD_SUMMARY = Template(
    "You are a Chief Security Officer preparing a board-level risk briefing "
    "for an enterprise physical security audit conducted under the CPP Seven "
    "Precis framework.\n\n"
    "Assessment data:\n"
    "- Total findings: $total_findings\n"
    "- Critical findings: $critical_count\n"
    "- Compliance gaps (critical + high): $compliance_gap_count\n"
    "- CPP domains with gaps: $domains_with_gaps\n\n"
    "Write a concise 3-paragraph board summary covering:\n"
    "1. Quantified risk exposure and potential financial impact\n"
    "2. Regulatory and insurance liability implications\n"
    "3. Recommended board resolution with budget and timeline indicators\n\n"
    "Tone: formal, risk-quantified, decision-oriented. "
    "Use language appropriate for C-suite and board directors. "
    "Do not use markdown formatting."
)

FINDING_RECOMMENDATION = Template(
    "You are a CPP-certified physical security consultant providing a "
    "remediation recommendation for an identified security gap.\n\n"
    "Finding details:\n"
    "- Track: $track\n"
    "- CPP Domain: $domain ($domain_name)\n"
    "- Audit Question: $question\n"
    "- Client Response: $answer\n"
    "- Classified Severity: $severity\n"
    "- Risk Impact: $risk_impact\n"
    "- CPP Standard Reference: $cpp_excerpt\n\n"
    "Write exactly 3 sentences:\n"
    "1. What the CPP standard requires for this domain (cite the standard)\n"
    "2. A specific, actionable remediation step with implementation timeline\n"
    "3. How to verify the remediation is effective (measurement or test)\n\n"
    "Tone: prescriptive, specific, budget-aware. "
    "Do not use generic phrases like 'address the gap'. "
    "Do not use markdown formatting."
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
