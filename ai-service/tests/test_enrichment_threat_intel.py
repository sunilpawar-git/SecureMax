"""Tests for threat intelligence enrichment — domain-filtered, source-cited."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from config import Settings
from report.enrichment import enrich_findings_with_threat_intel


@pytest.fixture()
def mock_conn():
    conn = AsyncMock()
    return conn


@pytest.fixture()
def mock_gemini():
    """Mock GeminiClient that returns a dummy 3072-dim embedding."""
    client = MagicMock()
    client.embed = AsyncMock(return_value=[0.1] * 3072)
    return client


@pytest.fixture()
def mock_settings():
    """Minimal Settings-like object for the semantic path."""
    s = MagicMock(spec=Settings)
    s.embedding_model = "text-embedding-004"
    return s


class TestThreatIntelEnrichment:
    @pytest.mark.asyncio
    async def test_returns_empty_for_no_findings(self, mock_conn) -> None:
        result = await enrich_findings_with_threat_intel([], mock_conn)
        assert result == []
        mock_conn.fetch.assert_not_called()

    @pytest.mark.asyncio
    async def test_queries_with_domain_filter(self, mock_conn) -> None:
        mock_conn.fetch.return_value = []
        findings = [{"domain": "CPP-01"}, {"domain": "CPP-03"}]
        await enrich_findings_with_threat_intel(findings, mock_conn)

        mock_conn.fetch.assert_called_once()
        call_args = mock_conn.fetch.call_args
        sql = call_args[0][0]
        domains_param = call_args[0][1]
        assert "?|" in sql
        assert sorted(domains_param) == ["CPP-01", "CPP-03"]

    @pytest.mark.asyncio
    async def test_returns_article_with_all_fields(self, mock_conn) -> None:
        from datetime import UTC, datetime

        scraped = datetime(2024, 6, 1, 12, 0, tzinfo=UTC)
        mock_conn.fetch.return_value = [
            {
                "id": "art-1",
                "title": "Security breach at facility",
                "url": "https://example.com/breach",
                "summary": "A major breach occurred",
                "domain_tags": '["CPP-01"]',
                "source": "SecurityWeek",
                "scraped_at": scraped,
            }
        ]
        findings = [{"domain": "CPP-01"}]
        result = await enrich_findings_with_threat_intel(findings, mock_conn)

        assert len(result) == 1
        article = result[0]
        assert article["id"] == "art-1"
        assert article["title"] == "Security breach at facility"
        assert article["source"] == "SecurityWeek"
        assert article["scraped_at"] == "2024-06-01T12:00:00+00:00"
        assert "CPP-01" in article["domain_tags"]

    @pytest.mark.asyncio
    async def test_respects_max_articles_limit(self, mock_conn) -> None:
        mock_conn.fetch.return_value = []
        findings = [{"domain": "CPP-01"}]
        await enrich_findings_with_threat_intel(findings, mock_conn, max_articles=3)

        call_args = mock_conn.fetch.call_args
        limit_param = call_args[0][2]
        assert limit_param == 3

    @pytest.mark.asyncio
    async def test_handles_jsonb_native_list(self, mock_conn) -> None:
        mock_conn.fetch.return_value = [
            {
                "id": "art-2",
                "title": "Test",
                "url": "https://example.com/test",
                "summary": "Summary",
                "domain_tags": ["CPP-05"],
                "source": "Reuters",
                "scraped_at": None,
            }
        ]
        findings = [{"domain": "CPP-05"}]
        result = await enrich_findings_with_threat_intel(findings, mock_conn)

        assert len(result) == 1
        assert result[0]["domain_tags"] == ["CPP-05"]
        assert result[0]["scraped_at"] is None

    @pytest.mark.asyncio
    async def test_deduplicates_finding_domains(self, mock_conn) -> None:
        mock_conn.fetch.return_value = []
        findings = [
            {"domain": "CPP-01"},
            {"domain": "CPP-01"},
            {"domain": "CPP-03"},
        ]
        await enrich_findings_with_threat_intel(findings, mock_conn)

        call_args = mock_conn.fetch.call_args
        domains_param = call_args[0][1]
        assert sorted(domains_param) == ["CPP-01", "CPP-03"]


class TestThreatIntelSemanticPath:
    """Tests for the pgvector semantic search path (gemini + settings provided)."""

    @pytest.mark.asyncio
    async def test_semantic_path_runs_vector_query(
        self, mock_conn, mock_gemini, mock_settings
    ) -> None:
        """When gemini is provided, the semantic path fires and uses <=> cosine operator."""
        from datetime import UTC, datetime

        scraped = datetime(2024, 1, 1, tzinfo=UTC)
        mock_conn.fetch.return_value = [
            {
                "id": "s-1",
                "title": "Semantic result",
                "url": "https://example.com/s",
                "summary": "Found via vector search",
                "domain_tags": '["CPP-01"]',
                "source": "Reuters",
                "scraped_at": scraped,
            }
        ]
        findings = [{"domain": "CPP-01", "question": "perimeter check", "answer": "none"}]
        result = await enrich_findings_with_threat_intel(
            findings, mock_conn, gemini=mock_gemini, settings=mock_settings
        )

        mock_gemini.embed.assert_called_once()
        sql = mock_conn.fetch.call_args[0][0]
        assert "<=>" in sql, "Semantic path must use pgvector cosine operator"
        assert len(result) == 1
        assert result[0]["title"] == "Semantic result"

    @pytest.mark.asyncio
    async def test_semantic_empty_result_does_not_trigger_fallback(
        self, mock_conn, mock_gemini, mock_settings
    ) -> None:
        """Empty semantic result is a valid response — tag fallback must NOT run."""
        mock_conn.fetch.return_value = []  # pgvector finds nothing
        findings = [{"domain": "CPP-02", "question": "leadership", "answer": "weak"}]
        result = await enrich_findings_with_threat_intel(
            findings, mock_conn, gemini=mock_gemini, settings=mock_settings
        )

        # fetch called exactly once for the semantic query; tag fallback adds a second call
        assert mock_conn.fetch.call_count == 1, (
            "Tag fallback must not run when semantic search succeeds with empty results"
        )
        assert result == []

    @pytest.mark.asyncio
    async def test_semantic_embedding_failure_falls_back_to_tags(
        self, mock_conn, mock_gemini, mock_settings
    ) -> None:
        """When Gemini embedding raises, we fall back to tag-based search."""
        from gemini_client import GeminiError

        mock_gemini.embed = AsyncMock(side_effect=GeminiError("rate limit"))
        mock_conn.fetch.return_value = []
        findings = [{"domain": "CPP-01"}]
        await enrich_findings_with_threat_intel(
            findings, mock_conn, gemini=mock_gemini, settings=mock_settings
        )

        sql = mock_conn.fetch.call_args[0][0]
        assert "?|" in sql, "After embedding failure, tag fallback must run"
