"""Tests for threat intelligence enrichment — domain-filtered, source-cited."""

from unittest.mock import AsyncMock

import pytest

from report.enrichment import enrich_findings_with_threat_intel


@pytest.fixture()
def mock_conn():
    conn = AsyncMock()
    return conn


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
