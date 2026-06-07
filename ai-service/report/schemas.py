"""
Pydantic models for report data structures.
Typed, validated contracts — no raw dicts in the report pipeline.
"""

from typing import Any

from pydantic import BaseModel, Field, field_validator

from config import TRACK_ENTERPRISE, TRACK_HNI

_VALID_SEVERITIES = {"critical", "high", "medium", "low"}
_VALID_TRACKS = {TRACK_HNI, TRACK_ENTERPRISE}


class Finding(BaseModel):
    """A single security finding derived from a session event."""

    domain: str
    domain_name: str
    question: str
    answer: str
    severity: str
    recommendation: str
    risk_impact: str | None = None
    cpp_citation: dict[str, str] | None = None
    requires_physical_verification: bool = False
    module_tag: str | None = None

    @field_validator("severity")
    @classmethod
    def _check_severity(cls, v: str) -> str:
        if v not in _VALID_SEVERITIES:
            raise ValueError(f"severity must be one of {_VALID_SEVERITIES}, got '{v}'")
        return v


class ReportSection(BaseModel):
    """A named section of the report with arbitrary data payload."""

    name: str
    data: dict[str, Any] = Field(default_factory=dict)


class ReportData(BaseModel):
    """Complete report data ready for template rendering."""

    track: str
    session_id: str
    findings: list[Finding]
    sections: list[ReportSection] = Field(default_factory=list)
    urgency_score: int = Field(ge=0, le=100)
    peer_benchmark_percentile: float = Field(ge=0.0, le=100.0)
    compliance_gap_count: int | None = None
    executive_summary: str | None = None
    board_summary: str | None = None
    threat_intel_articles: list[dict[str, Any]] = Field(default_factory=list)
    compliance_mappings: list["ComplianceMapping"] = Field(default_factory=list)
    radar_scores: dict[str, float] = Field(default_factory=dict)
    trend_summary: str | None = None
    free_summary: "FreeSummary | None" = None

    @field_validator("track")
    @classmethod
    def _check_track(cls, v: str) -> str:
        if v not in _VALID_TRACKS:
            raise ValueError(f"track must be one of {_VALID_TRACKS}, got '{v}'")
        return v


class FreeSummary(BaseModel):
    """The unpaid summary: blurred findings, urgency score, peer benchmark."""

    urgency_score: int
    domains_with_gaps: list[str]
    findings_preview: list[dict[str, Any]]
    peer_benchmark: dict[str, Any]
    compliance_gap_count: int | None = None


class ThreatIntelArticle(BaseModel):
    """A threat intelligence article referenced in the report."""

    id: str
    title: str
    url: str
    summary: str
    domain_tags: list[str] = Field(default_factory=list)
    source: str = "unknown"
    scraped_at: str | None = None


class ComplianceMapping(BaseModel):
    """Maps a finding to ISO 27001 / PSARA compliance clauses."""

    finding_domain: str
    iso_clause: str
    psara_section: str
    remediation_owner_role: str


class GenerateReportRequest(BaseModel):
    """Request to initiate report generation."""

    session_id: str


class GenerateReportResponse(BaseModel):
    """Response after initiating report generation."""

    report_id: str
    status: str


class ReportStatusResponse(BaseModel):
    """Status of a report job."""

    report_id: str
    session_id: str = ""
    status: str
    progress: int = 0
    downloadable: bool = False


class AdminRegenerateRequest(BaseModel):
    """Admin request to regenerate a report."""

    session_id: str
