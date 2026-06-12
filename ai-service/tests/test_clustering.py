"""Phase 2B tests — Pass 1 Cluster & Theme module."""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from newsletter.clustering import cluster_articles, fallback_cluster
from newsletter.constants import MAX_NEWSLETTER_THEMES
from newsletter.models import ThemeCluster


def _make_articles(n: int = 4) -> list[dict]:
    return [
        {
            "id": f"art-{i}",
            "title": f"Security article {i}",
            "summary": f"Summary of article {i} about physical security",
            "domain_tags": [f"CPP-0{(i % 3) + 1}"],
        }
        for i in range(1, n + 1)
    ]


class TestClusterArticles:
    @pytest.mark.asyncio
    async def test_parses_valid_gemini_response(self) -> None:
        articles = _make_articles(4)
        gemini_response = json.dumps(
            [
                {
                    "theme_title": "Perimeter Breaches",
                    "theme_summary": "Multiple fence breaches this week",
                    "article_ids": ["art-1", "art-2"],
                    "primary_domain": "CPP-01",
                    "secondary_domains": ["CPP-07"],
                },
                {
                    "theme_title": "Crisis Response Failures",
                    "theme_summary": "Emergency drills exposed gaps",
                    "article_ids": ["art-3", "art-4"],
                    "primary_domain": "CPP-03",
                },
            ]
        )
        gemini = MagicMock()
        gemini.generate = AsyncMock(return_value=gemini_response)

        result = await cluster_articles(articles, gemini=gemini)

        assert len(result) == 2
        assert all(isinstance(c, ThemeCluster) for c in result)
        assert result[0].theme_title == "Perimeter Breaches"
        assert result[0].primary_domain == "CPP-01"

    @pytest.mark.asyncio
    async def test_strips_markdown_fences(self) -> None:
        articles = _make_articles(2)
        gemini = MagicMock()
        gemini.generate = AsyncMock(
            return_value="```json\n"
            + json.dumps(
                [
                    {
                        "theme_title": "Theme 1",
                        "theme_summary": "Sum",
                        "article_ids": ["art-1", "art-2"],
                        "primary_domain": "CPP-01",
                    }
                ]
            )
            + "\n```"
        )

        result = await cluster_articles(articles, gemini=gemini)
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_caps_at_max_themes(self) -> None:
        articles = _make_articles(10)
        clusters = [
            {
                "theme_title": f"Theme {i}",
                "theme_summary": f"Sum {i}",
                "article_ids": [f"art-{i}"],
                "primary_domain": "CPP-01",
            }
            for i in range(1, 11)
        ]
        gemini = MagicMock()
        gemini.generate = AsyncMock(return_value=json.dumps(clusters))

        result = await cluster_articles(articles, gemini=gemini)
        assert len(result) <= MAX_NEWSLETTER_THEMES

    @pytest.mark.asyncio
    async def test_falls_back_on_gemini_error(self) -> None:
        articles = _make_articles(3)
        gemini = MagicMock()
        gemini.generate = AsyncMock(side_effect=RuntimeError("API down"))

        result = await cluster_articles(articles, gemini=gemini)
        assert len(result) > 0
        assert all(isinstance(c, ThemeCluster) for c in result)

    @pytest.mark.asyncio
    async def test_falls_back_on_invalid_json(self) -> None:
        articles = _make_articles(2)
        gemini = MagicMock()
        gemini.generate = AsyncMock(return_value="not json")

        result = await cluster_articles(articles, gemini=gemini)
        assert len(result) > 0


class TestFallbackCluster:
    def test_groups_by_primary_domain(self) -> None:
        articles = [
            {"id": "a1", "title": "T1", "summary": "S1", "domain_tags": ["CPP-01"]},
            {"id": "a2", "title": "T2", "summary": "S2", "domain_tags": ["CPP-01"]},
            {"id": "a3", "title": "T3", "summary": "S3", "domain_tags": ["CPP-03"]},
        ]
        result = fallback_cluster(articles)
        assert len(result) == 2
        domains = [c.primary_domain for c in result]
        assert "CPP-01" in domains
        assert "CPP-03" in domains

    def test_missing_domain_defaults_to_cpp07(self) -> None:
        articles = [
            {"id": "a1", "title": "T1", "summary": "S1", "domain_tags": []},
        ]
        result = fallback_cluster(articles)
        assert result[0].primary_domain == "CPP-07"

    def test_all_articles_covered(self) -> None:
        articles = _make_articles(6)
        result = fallback_cluster(articles)
        covered = {aid for c in result for aid in c.article_ids}
        all_ids = {a["id"] for a in articles}
        assert covered == all_ids

    def test_respects_max_themes(self) -> None:
        articles = [
            {"id": f"a{i}", "title": f"T{i}", "summary": f"S{i}", "domain_tags": [f"CPP-0{i}"]}
            for i in range(1, 8)
        ]
        result = fallback_cluster(articles)
        assert len(result) <= MAX_NEWSLETTER_THEMES
