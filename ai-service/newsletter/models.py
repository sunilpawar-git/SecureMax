"""Newsletter data models for the multi-pass synthesis pipeline."""

from pydantic import BaseModel, Field


class ThemeCluster(BaseModel):
    """Pass 1 output: a group of related articles sharing a security theme."""

    theme_title: str
    theme_summary: str
    article_ids: list[str]
    primary_domain: str
    secondary_domains: list[str] = Field(default_factory=list)


class SegmentImpact(BaseModel):
    """Per-theme implications for each audience segment."""

    hni: str = ""
    enterprise: str = ""
    critical_infrastructure: str = ""


class EnrichedTheme(BaseModel):
    """Pass 2 output: a theme enriched with CPP context and segment analysis."""

    theme_title: str
    situation: str
    assessment: str
    implications: str
    recommendation: str
    cpp_domain: str
    cpp_citation: str = ""
    segment_impact: SegmentImpact = Field(default_factory=SegmentImpact)
    source_article_ids: list[str] = Field(default_factory=list)


class NewsletterContent(BaseModel):
    """Pass 3 output: the complete newsletter in three content tiers."""

    title: str
    issue_date: str = ""
    executive_summary: str
    intelligence_briefing: str
    full_analysis: str
    commanders_note: str = ""
    cta_soft: str = ""
    cta_audit_link: str = ""
    themes: list[EnrichedTheme] = Field(default_factory=list)
