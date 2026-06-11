"""Data models for threat intelligence ingestion."""

import hashlib
from datetime import UTC, datetime

from pydantic import BaseModel, Field

from newsletter.constants import AUDIENCE_SEGMENTS


class RawArticle(BaseModel):
    url: str
    title: str
    content: str
    source_name: str
    source_tier: str = Field(pattern=r"^(news_api|rss|playwright)$")
    published_at: datetime | None = None
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @property
    def url_hash(self) -> str:
        return hashlib.sha256(self.url.encode()).hexdigest()

    @property
    def content_hash(self) -> str:
        return hashlib.sha256(self.content.strip().encode()).hexdigest()


class IntelScores(BaseModel):
    """Multi-dimension intelligence scoring for newsletter quality gating."""

    physical_security_relevance: float = Field(default=0.0, ge=0.0, le=1.0)
    geographic_relevance: float = Field(default=0.0, ge=0.0, le=1.0)
    threat_actionability: float = Field(default=0.0, ge=0.0, le=1.0)
    educational_value: float = Field(default=0.0, ge=0.0, le=1.0)
    recency_novelty: float = Field(default=0.0, ge=0.0, le=1.0)
    audience_impact: float = Field(default=0.0, ge=0.0, le=1.0)
    affected_segments: list[str] = Field(default_factory=list)

    def model_post_init(self, __context) -> None:
        self.affected_segments = [
            s for s in self.affected_segments if s in AUDIENCE_SEGMENTS
        ]


class ProcessedArticle(BaseModel):
    """Maps 1:1 to the threat_intel table columns (plus internal tracking fields)."""

    title: str
    url: str
    content_hash: str
    summary: str
    domain_tags: list[str]
    industry_tags: list[str]
    source: str
    relevance_score: float = 0.0
    intel_scores: IntelScores | None = None
    tagged_by_gemini: bool = False


class SourceHealth(BaseModel):
    source_name: str
    source_tier: str
    last_success: datetime | None = None
    last_failure: datetime | None = None
    consecutive_failures: int = 0
    total_articles: int = 0
    is_healthy: bool = True

    def record_success(self, count: int = 1) -> None:
        self.last_success = datetime.now(UTC)
        self.consecutive_failures = 0
        self.total_articles += count
        self.is_healthy = True

    def record_failure(self) -> None:
        self.last_failure = datetime.now(UTC)
        self.consecutive_failures += 1
        if self.consecutive_failures >= 3:
            self.is_healthy = False
