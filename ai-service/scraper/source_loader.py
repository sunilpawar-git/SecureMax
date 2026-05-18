"""
Loads and validates scraper source configuration from sources.yaml (SSOT).
"""

from pathlib import Path
from typing import Any

import yaml

_SOURCES_PATH = Path(__file__).parent / "sources.yaml"

_REQUIRED_FIELDS = {
    "newsapi": {"name", "type", "query", "api_key_env"},
    "rss": {"name", "type", "url"},
    "playwright": {"name", "type", "url", "selector_article", "selector_title", "selector_link"},
}


def load_sources(path: str | Path | None = None) -> dict[str, list[dict[str, Any]]]:
    """Load sources.yaml and return the parsed dict with validation."""
    filepath = Path(path) if path else _SOURCES_PATH
    with open(filepath) as f:
        data = yaml.safe_load(f)

    if not isinstance(data, dict):
        raise ValueError("sources.yaml must be a YAML mapping")

    for tier in ("newsapi", "rss", "playwright"):
        entries = data.get(tier, [])
        if not isinstance(entries, list):
            raise ValueError(f"sources.yaml: '{tier}' must be a list")
        required = _REQUIRED_FIELDS[tier]
        for entry in entries:
            missing = required - set(entry.keys())
            if missing:
                raise ValueError(
                    f"sources.yaml: entry '{entry.get('name', '?')}' "
                    f"in '{tier}' missing fields: {missing}"
                )

    return data


def get_rss_feeds(sources: dict | None = None) -> list[dict[str, str]]:
    """Return list of {url, name} for RSS tier."""
    data = sources or load_sources()
    return [{"url": e["url"], "name": e["name"]} for e in data.get("rss", [])]


def get_playwright_targets(sources: dict | None = None) -> list[dict[str, Any]]:
    """Return list of playwright scraper targets."""
    data = sources or load_sources()
    return data.get("playwright", [])
