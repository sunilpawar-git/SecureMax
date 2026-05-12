"""Data models for threat intelligence ingestion."""

import hashlib
from datetime import UTC, datetime

from pydantic import BaseModel, Field


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


class ProcessedArticle(BaseModel):
    url: str
    url_hash: str
    content_hash: str
    title: str
    summary: str
    tags: list[str]
    relevance_score: float = 0.0
    source_name: str
    source_tier: str
    published_at: datetime | None = None
    processed_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


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
