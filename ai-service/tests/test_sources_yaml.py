"""
Phase 3 — Test 3.2: Validate sources.yaml structure and source_loader.
"""

from pathlib import Path

from scraper.source_loader import get_playwright_targets, get_rss_feeds, load_sources

_YAML_PATH = Path(__file__).parent.parent / "scraper" / "sources.yaml"


class TestSourcesYaml:
    def test_sources_yaml_is_loadable(self) -> None:
        data = load_sources(_YAML_PATH)
        assert isinstance(data, dict)

    def test_newsapi_entries_have_required_fields(self) -> None:
        data = load_sources(_YAML_PATH)
        for entry in data.get("newsapi", []):
            assert "name" in entry
            assert "type" in entry
            assert entry["type"] == "newsapi"
            assert "query" in entry
            assert "api_key_env" in entry

    def test_rss_entries_have_required_fields(self) -> None:
        data = load_sources(_YAML_PATH)
        for entry in data.get("rss", []):
            assert "name" in entry
            assert "type" in entry
            assert entry["type"] == "rss"
            assert "url" in entry

    def test_playwright_entries_have_required_fields(self) -> None:
        data = load_sources(_YAML_PATH)
        for entry in data.get("playwright", []):
            assert "name" in entry
            assert "type" in entry
            assert entry["type"] == "playwright"
            assert "url" in entry
            assert "selector_article" in entry
            assert "selector_title" in entry
            assert "selector_link" in entry

    def test_get_rss_feeds_returns_list(self) -> None:
        feeds = get_rss_feeds()
        assert isinstance(feeds, list)
        assert len(feeds) > 0
        assert all("url" in f and "name" in f for f in feeds)

    def test_get_playwright_targets_returns_list(self) -> None:
        targets = get_playwright_targets()
        assert isinstance(targets, list)
        assert len(targets) > 0

    def test_source_count_minimum(self) -> None:
        """Validate we have sufficient source diversity for gold-standard coverage.

        Counts as of Sprint 8 (dead-feed purge): 7 NewsAPI + 18 RSS + 5 Playwright.
        7 broken feeds (403/404/HTML-not-RSS) replaced with 6 verified-live feeds.
        Ratchet: adjust upward when sources are added, never downward.
        """
        data = load_sources(_YAML_PATH)
        assert len(data.get("newsapi", [])) >= 7
        assert len(data.get("rss", [])) >= 18  # 18 feeds as of Sprint 8
        assert len(data.get("playwright", [])) >= 5
