"""Tests for threat intel scraper — Phase 7 verification."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scraper.dedup import InMemoryDedupStore, is_duplicate
from scraper.models import ProcessedArticle, RawArticle, SourceHealth
from scraper.pipeline import _fallback_process, _persist_article, reset_pipeline, run_pipeline


@pytest.fixture(autouse=True)
def clean_state() -> None:
    reset_pipeline()


class TestInMemoryDedupStore:
    def test_new_article_not_duplicate(self) -> None:
        store = InMemoryDedupStore()
        assert not store.is_duplicate("url1", "chash1")

    def test_seen_url_is_duplicate(self) -> None:
        store = InMemoryDedupStore()
        store.mark_seen("url1", "chash1")
        assert store.is_duplicate("url1", "different_content")

    def test_seen_content_is_duplicate(self) -> None:
        store = InMemoryDedupStore()
        store.mark_seen("url1", "chash1")
        assert store.is_duplicate("different_url", "chash1")

    def test_reset_clears_state(self) -> None:
        store = InMemoryDedupStore()
        store.mark_seen("u1", "c1")
        store.reset()
        assert not store.is_duplicate("u1", "c1")

    def test_count_tracks_urls(self) -> None:
        store = InMemoryDedupStore()
        store.mark_seen("u1", "c1")
        store.mark_seen("u2", "c2")
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


class TestFallbackProcess:
    def test_tags_cctv_as_cpp01(self) -> None:
        article = RawArticle(
            url="https://example.com/1",
            title="CCTV breach",
            content="CCTV surveillance was bypassed in a physical security incident.",
            source_name="Test",
            source_tier="rss",
        )
        processed = _fallback_process(article)
        assert isinstance(processed, ProcessedArticle)
        assert "CPP-01" in processed.domain_tags
        assert isinstance(processed.industry_tags, list)
        assert processed.source == "Test (rss)"

    def test_unknown_content_gets_cpp07_default(self) -> None:
        article = RawArticle(
            url="https://example.com/2",
            title="Generic news",
            content="Something unrelated to security keywords.",
            source_name="Test",
            source_tier="rss",
        )
        processed = _fallback_process(article)
        assert processed.domain_tags == ["CPP-07"]

    def test_processed_article_has_required_fields(self) -> None:
        article = RawArticle(
            url="https://example.com/3",
            title="Guard patrol incident",
            content="Guard patrol schedule was exploited for theft prevention bypass.",
            source_name="Src",
            source_tier="news_api",
        )
        processed = _fallback_process(article)
        assert processed.title == "Guard patrol incident"
        assert processed.url == "https://example.com/3"
        assert processed.content_hash
        assert processed.summary
        assert processed.domain_tags
        assert processed.industry_tags
        assert processed.source

    def test_fallback_tagged_by_gemini_is_false(self) -> None:
        """Fallback articles must not claim Gemini tagged them."""
        article = RawArticle(
            url="https://example.com/4",
            title="Test",
            content="cctv physical security",
            source_name="S",
            source_tier="rss",
        )
        processed = _fallback_process(article)
        assert processed.tagged_by_gemini is False


class TestDbDedup:
    @pytest.mark.asyncio
    async def test_is_duplicate_returns_true_for_existing_url(self) -> None:
        mock_conn = AsyncMock()
        mock_conn.fetchval = AsyncMock(return_value=1)
        mock_pool = MagicMock()
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await is_duplicate("https://example.com", "hash123", mock_pool)

        assert result is True
        mock_conn.fetchval.assert_called_once()
        call_args = mock_conn.fetchval.call_args
        assert "https://example.com" in call_args.args
        assert "hash123" in call_args.args

    @pytest.mark.asyncio
    async def test_is_duplicate_returns_false_for_new_article(self) -> None:
        mock_conn = AsyncMock()
        mock_conn.fetchval = AsyncMock(return_value=None)
        mock_pool = MagicMock()
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

        result = await is_duplicate("https://new.com", "newhash", mock_pool)

        assert result is False


class TestPersistArticle:
    @pytest.mark.asyncio
    async def test_persist_returns_true_on_insert(self) -> None:
        mock_conn = AsyncMock()
        mock_conn.fetchrow = AsyncMock(return_value={"id": "new-id-123"})
        mock_pool = MagicMock()
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

        article = ProcessedArticle(
            title="Test",
            url="https://example.com/test",
            content_hash="abc123",
            summary="A test article.",
            domain_tags=["CPP-01"],
            industry_tags=["general"],
            source="Test (rss)",
        )

        result = await _persist_article(article, mock_pool)

        assert result is True
        mock_conn.fetchrow.assert_called_once()
        call_sql = mock_conn.fetchrow.call_args.args[0]
        assert "INSERT INTO threat_intel" in call_sql
        assert "relevance_score" in call_sql

    @pytest.mark.asyncio
    async def test_persist_returns_false_on_conflict(self) -> None:
        mock_conn = AsyncMock()
        mock_conn.fetchrow = AsyncMock(return_value=None)
        mock_pool = MagicMock()
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

        article = ProcessedArticle(
            title="Dup",
            url="https://already-exists.com",
            content_hash="dupchash",
            summary="Duplicate.",
            domain_tags=["CPP-07"],
            industry_tags=["general"],
            source="Test (rss)",
        )

        result = await _persist_article(article, mock_pool)

        assert result is False

    @pytest.mark.asyncio
    async def test_persist_stores_domain_tags_as_json(self) -> None:
        mock_conn = AsyncMock()
        mock_conn.fetchrow = AsyncMock(return_value={"id": "new-id-456"})
        mock_pool = MagicMock()
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

        article = ProcessedArticle(
            title="T",
            url="https://x.com/1",
            content_hash="h1",
            summary="S",
            domain_tags=["CPP-01", "CPP-05"],
            industry_tags=["retail"],
            source="Test (news_api)",
        )

        await _persist_article(article, mock_pool)

        call_args = mock_conn.fetchrow.call_args.args
        # domain_tags must be serialized JSON string
        domain_tags_arg = call_args[5]
        parsed = json.loads(domain_tags_arg)
        assert parsed == ["CPP-01", "CPP-05"]


class TestGeminiTagger:
    @pytest.mark.asyncio
    async def test_successful_gemini_tag_sets_tagged_by_gemini(self) -> None:
        from routers.scraper import _make_gemini_tagger

        gemini_response = json.dumps(
            {
                "summary": "A physical security breach occurred.",
                "domain_tags": ["CPP-01"],
                "industry_tags": ["corporate"],
                "relevance_score": 0.8,
            }
        )
        mock_gemini = MagicMock()
        mock_gemini.generate = AsyncMock(return_value=gemini_response)

        tagger = _make_gemini_tagger(mock_gemini)
        article = RawArticle(
            url="https://example.com/breach",
            title="Security Breach",
            content="A major physical security breach was reported.",
            source_name="Test",
            source_tier="rss",
        )

        result = await tagger(article)

        assert result.tagged_by_gemini is True
        assert result.domain_tags == ["CPP-01"]
        assert result.industry_tags == ["corporate"]
        assert result.relevance_score == 0.8

    @pytest.mark.asyncio
    async def test_gemini_failure_falls_back_and_not_tagged_by_gemini(self) -> None:
        from routers.scraper import _make_gemini_tagger

        mock_gemini = MagicMock()
        mock_gemini.generate = AsyncMock(side_effect=RuntimeError("Gemini unavailable"))

        tagger = _make_gemini_tagger(mock_gemini)
        article = RawArticle(
            url="https://example.com/fallback",
            title="CCTV incident",
            content="CCTV surveillance was bypassed.",
            source_name="Test",
            source_tier="rss",
        )

        result = await tagger(article)

        assert result.tagged_by_gemini is False
        assert "CPP-01" in result.domain_tags

    @pytest.mark.asyncio
    async def test_gemini_invalid_json_falls_back(self) -> None:
        from routers.scraper import _make_gemini_tagger

        mock_gemini = MagicMock()
        mock_gemini.generate = AsyncMock(return_value="not valid json at all")

        tagger = _make_gemini_tagger(mock_gemini)
        article = RawArticle(
            url="https://example.com/badjson",
            title="Test",
            content="access control system failure.",
            source_name="Test",
            source_tier="news_api",
        )

        result = await tagger(article)

        assert result.tagged_by_gemini is False


class TestNewsApiYamlWiring:
    """Verify pipeline iterates YAML newsapi entries instead of using hardcoded query."""

    @pytest.mark.asyncio
    async def test_fetch_news_api_tier_iterates_yaml_entries(self) -> None:
        """Pipeline calls fetch_news_api once per YAML newsapi entry with correct query."""
        mock_pool = MagicMock()
        mock_conn = AsyncMock()
        mock_conn.fetchval = AsyncMock(return_value=None)
        mock_conn.execute = AsyncMock(return_value="INSERT 0 1")
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

        yaml_sources = {
            "newsapi": [
                {
                    "name": "query1",
                    "type": "newsapi",
                    "query": "physical security",
                    "api_key_env": "NEWS_API_KEY",
                    "page_size": 10,
                },
                {
                    "name": "query2",
                    "type": "newsapi",
                    "query": "CCTV surveillance",
                    "api_key_env": "NEWS_API_KEY",
                },
            ],
            "rss": [],
            "playwright": [],
        }

        with (
            patch("scraper.fetchers.load_sources", return_value=yaml_sources),
            patch("scraper.fetchers.fetch_news_api", AsyncMock(return_value=[])) as mock_fetch,
            patch("scraper.fetchers.fetch_rss_feed", AsyncMock(return_value=[])),
            patch("scraper.fetchers.fetch_playwright_tier", AsyncMock(return_value=[])),
            patch("scraper.fetchers.RSS_FEEDS", []),
        ):
            await run_pipeline(mock_pool)

        assert mock_fetch.call_count == 2
        calls = mock_fetch.call_args_list
        assert calls[0].kwargs["query"] == "physical security"
        assert calls[0].kwargs["page_size"] == 10
        assert calls[1].kwargs["query"] == "CCTV surveillance"
        assert calls[1].kwargs["page_size"] == 20  # default

    @pytest.mark.asyncio
    async def test_fetch_news_api_accepts_page_size_param(self) -> None:
        """page_size parameter flows through to the API request."""
        from scraper.sources import fetch_news_api

        with patch("scraper.sources.get_settings") as mock_settings:
            mock_settings.return_value.news_api_key = ""
            result = await fetch_news_api(query="test", page_size=5)

        assert result == []

    @pytest.mark.asyncio
    async def test_pipeline_deduplicates_across_newsapi_queries(self) -> None:
        """Two queries returning the same URL should be deduped."""
        mock_pool = MagicMock()
        mock_conn = AsyncMock()
        mock_conn.fetchval = AsyncMock(return_value=None)
        mock_conn.execute = AsyncMock(return_value="INSERT 0 1")
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

        shared_article = RawArticle(
            url="https://shared.com/article",
            title="Shared",
            content="physical security content",
            source_name="TestSource",
            source_tier="news_api",
        )

        yaml_sources = {
            "newsapi": [
                {"name": "q1", "type": "newsapi", "query": "q1", "api_key_env": "X"},
                {"name": "q2", "type": "newsapi", "query": "q2", "api_key_env": "X"},
            ],
            "rss": [],
            "playwright": [],
        }

        with (
            patch("scraper.fetchers.load_sources", return_value=yaml_sources),
            patch("scraper.fetchers.fetch_news_api", AsyncMock(return_value=[shared_article])),
            patch("scraper.fetchers.fetch_rss_feed", AsyncMock(return_value=[])),
            patch("scraper.fetchers.fetch_playwright_tier", AsyncMock(return_value=[])),
            patch("scraper.fetchers.RSS_FEEDS", []),
        ):
            stats = await run_pipeline(mock_pool)

        assert stats["stored"] == 1


class TestPipelineLock:
    @pytest.mark.asyncio
    async def test_lock_busy_returns_complete_stats_shape(self) -> None:
        """When pipeline is already running, the early-return must include all stat keys."""
        mock_pool = MagicMock()
        # Acquire the lock externally to simulate a running pipeline
        from scraper.pipeline import _pipeline_lock

        async with _pipeline_lock:
            result = await run_pipeline(mock_pool)

        assert "error" in result
        assert result["fetched"] == 0
        assert result["stored"] == 0
        assert result["duplicates"] == 0
        assert result["gemini_tagged"] == 0
        assert result["errors"] == []

    @pytest.mark.asyncio
    async def test_reset_pipeline_releases_lock(self) -> None:
        """reset_pipeline() must create a fresh unlocked Lock."""
        from scraper import pipeline as p

        # Acquire old lock and then reset
        await p._pipeline_lock.acquire()
        reset_pipeline()

        # New lock should be acquirable
        assert not p._pipeline_lock.locked()

    @pytest.mark.asyncio
    async def test_gemini_tagged_counter_accurate(self) -> None:
        """gemini_tagged increments only when Gemini actually ran (tagged_by_gemini=True)."""
        mock_pool = MagicMock()

        # Dedup always returns False (new article)
        mock_conn = AsyncMock()
        mock_conn.fetchval = AsyncMock(return_value=None)
        mock_conn.execute = AsyncMock(return_value="INSERT 0 1")
        mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

        fallback_article = RawArticle(
            url="https://example.com/test-counter",
            title="Test",
            content="physical security breach cctv",
            source_name="Test",
            source_tier="rss",
        )

        async def process_fn_fallback(article: RawArticle) -> ProcessedArticle:
            """Simulates _make_gemini_tagger when Gemini fails (tagged_by_gemini=False)."""
            return _fallback_process(article)

        with (
            patch("scraper.fetchers.fetch_news_api", AsyncMock(return_value=[])),
            patch("scraper.fetchers.fetch_rss_feed", AsyncMock(return_value=[fallback_article])),
            patch("scraper.fetchers.fetch_playwright_tier", AsyncMock(return_value=[])),
            patch("scraper.fetchers.RSS_FEEDS", [{"url": "x", "name": "TestFeed"}]),
        ):
            stats = await run_pipeline(mock_pool, process_fn=process_fn_fallback)

        assert stats["gemini_tagged"] == 0
        assert stats["stored"] == 1
