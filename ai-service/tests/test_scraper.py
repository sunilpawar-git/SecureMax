"""Tests for threat intel scraper — Phase 7 verification."""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app
from scraper.dedup import DedupStore
from scraper.models import RawArticle, SourceHealth
from scraper.pipeline import reset_pipeline

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_state() -> None:
    reset_pipeline()


class TestDedupStore:
    def test_new_article_not_duplicate(self) -> None:
        store = DedupStore()
        assert not store.is_duplicate("hash1", "chash1")

    def test_seen_url_is_duplicate(self) -> None:
        store = DedupStore()
        store.mark_seen("hash1", "chash1")
        assert store.is_duplicate("hash1", "different_content")

    def test_seen_content_is_duplicate(self) -> None:
        store = DedupStore()
        store.mark_seen("hash1", "chash1")
        assert store.is_duplicate("different_url", "chash1")

    def test_reset_clears_state(self) -> None:
        store = DedupStore()
        store.mark_seen("h1", "c1")
        store.reset()
        assert not store.is_duplicate("h1", "c1")

    def test_count_tracks_urls(self) -> None:
        store = DedupStore()
        store.mark_seen("h1", "c1")
        store.mark_seen("h2", "c2")
        assert store.count == 2


class TestSourceHealth:
    def test_healthy_after_success(self) -> None:
        health = SourceHealth(source_name="test", source_tier="rss")
        health.record_success(5)
        assert health.is_healthy
        assert health.total_articles == 5
        assert health.consecutive_failures == 0

    def test_unhealthy_after_3_failures(self) -> None:
        health = SourceHealth(source_name="test", source_tier="rss")
        health.record_failure()
        health.record_failure()
        assert health.is_healthy
        health.record_failure()
        assert not health.is_healthy

    def test_success_resets_failure_count(self) -> None:
        health = SourceHealth(source_name="test", source_tier="rss")
        health.record_failure()
        health.record_failure()
        health.record_success()
        assert health.consecutive_failures == 0
        assert health.is_healthy


class TestRawArticle:
    def test_url_hash_deterministic(self) -> None:
        article = RawArticle(
            url="https://example.com/article-1",
            title="Test",
            content="Content",
            source_name="Test Source",
            source_tier="news_api",
        )
        assert article.url_hash == article.url_hash

    def test_different_urls_different_hashes(self) -> None:
        a1 = RawArticle(
            url="https://example.com/1",
            title="T",
            content="C",
            source_name="S",
            source_tier="rss",
        )
        a2 = RawArticle(
            url="https://example.com/2",
            title="T",
            content="C",
            source_name="S",
            source_tier="rss",
        )
        assert a1.url_hash != a2.url_hash

    def test_content_hash_ignores_whitespace(self) -> None:
        a1 = RawArticle(
            url="https://example.com/1",
            title="T",
            content="  content  ",
            source_name="S",
            source_tier="rss",
        )
        a2 = RawArticle(
            url="https://example.com/2",
            title="T",
            content="content",
            source_name="S",
            source_tier="rss",
        )
        assert a1.content_hash == a2.content_hash


class TestScraperAPI:
    @patch("scraper.pipeline.fetch_news_api", new_callable=AsyncMock)
    @patch("scraper.pipeline.fetch_rss_feed", new_callable=AsyncMock)
    def test_run_pipeline_with_mock_sources(
        self, mock_rss: AsyncMock, mock_news: AsyncMock
    ) -> None:
        mock_news.return_value = [
            RawArticle(
                url="https://news.example.com/1",
                title="CCTV breakthrough",
                content="New CCTV surveillance technology released.",
                source_name="News Source",
                source_tier="news_api",
            ),
        ]
        call_count = [0]

        async def rss_side_effect(*args, **kwargs):
            call_count[0] += 1
            return [
                RawArticle(
                    url=f"https://rss.example.com/{call_count[0]}",
                    title=f"RSS article {call_count[0]}",
                    content=f"Unique content for RSS article {call_count[0]}.",
                    source_name=args[1] if len(args) > 1 else "RSS",
                    source_tier="rss",
                )
            ]

        mock_rss.side_effect = rss_side_effect

        resp = client.post("/scraper/run")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "completed"
        assert data["stats"]["stored"] >= 2
        assert data["stats"]["duplicates"] == 0

    @patch("scraper.pipeline.fetch_news_api", new_callable=AsyncMock)
    @patch("scraper.pipeline.fetch_rss_feed", new_callable=AsyncMock)
    def test_dedup_prevents_double_insert(self, mock_rss: AsyncMock, mock_news: AsyncMock) -> None:
        article = RawArticle(
            url="https://news.example.com/same",
            title="Same article",
            content="Same content",
            source_name="Source",
            source_tier="news_api",
        )
        mock_news.return_value = [article]
        mock_rss.return_value = []

        client.post("/scraper/run")
        resp = client.post("/scraper/run")
        data = resp.json()
        assert data["stats"]["duplicates"] == 1
        assert data["stats"]["stored"] == 0

    def test_health_endpoint(self) -> None:
        resp = client.get("/scraper/health")
        assert resp.status_code == 200
        assert "sources" in resp.json()

    @patch("scraper.pipeline.fetch_news_api", new_callable=AsyncMock)
    @patch("scraper.pipeline.fetch_rss_feed", new_callable=AsyncMock)
    def test_articles_endpoint(self, mock_rss: AsyncMock, mock_news: AsyncMock) -> None:
        mock_news.return_value = [
            RawArticle(
                url="https://example.com/art",
                title="Security Article",
                content="Physical security best practices.",
                source_name="Source",
                source_tier="news_api",
            ),
        ]
        mock_rss.return_value = []

        client.post("/scraper/run")
        resp = client.get("/scraper/articles")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["articles"][0]["title"] == "Security Article"
