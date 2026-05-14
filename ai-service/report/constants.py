"""
SSOT for report-specific constants.
Shared by Python code and Jinja2 templates (passed as template context).
"""

SEVERITY_COLORS = {
    "critical": "#DC2626",
    "high": "#EA580C",
    "medium": "#CA8A04",
    "low": "#16A34A",
}

RADAR_COLORS = {
    "high": "#16A34A",
    "medium": "#CA8A04",
    "low": "#DC2626",
}

RADAR_THRESHOLD_HIGH = 70.0
RADAR_THRESHOLD_MEDIUM = 40.0

HNI_SECTION_NAMES = [
    "executive_summary",
    "radar_scores",
    "peer_benchmark",
    "findings_by_severity",
    "domain_breakdown",
    "recommendations",
    "next_steps",
    "methodology",
]

ENTERPRISE_SECTION_NAMES = [
    "board_executive_summary",
    "radar_scores",
    "peer_benchmark",
    "compliance_gap_analysis",
    "findings_by_severity",
    "domain_breakdown",
    "module_findings",
    "recommendations",
    "remediation_roadmap",
    "methodology",
]

RISK_THRESHOLD_CRITICAL = 70
RISK_THRESHOLD_HIGH = 40

DEFAULT_WHITE_LABEL = {
    "company_name": "Raivan Global",
    "logo_url": "",
    "primary_color": "#1E3A5F",
    "accent_color": "#16A34A",
}

CONFIDENTIALITY_NOTICE = (
    "CONFIDENTIAL — This report is intended solely for the addressee. "
    "Unauthorized distribution is prohibited."
)

REPORT_JOB_PENDING = "pending"
REPORT_JOB_PROCESSING = "processing"
REPORT_JOB_COMPLETED = "completed"
REPORT_JOB_FAILED = "failed"
