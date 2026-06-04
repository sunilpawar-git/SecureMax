"""Regression tests: Next.js and AI service must share the same PostgreSQL database."""

from pathlib import Path

from db import parse_database_name

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def _read_env_value(path: Path, key: str) -> str:
    text = path.read_text()
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("#") or "=" not in stripped:
            continue
        name, _, value = stripped.partition("=")
        if name.strip() == key:
            return value.strip().strip('"').strip("'")
    raise AssertionError(f"{key} not found in {path}")


class TestDatabaseAlignment:
    def test_env_examples_use_same_database_name(self) -> None:
        """Both services must point at one DB — mismatches cause FK 500s on session start."""
        root_db = _read_env_value(REPO_ROOT / ".env.example", "DATABASE_URL")
        ai_db = _read_env_value(REPO_ROOT / "ai-service" / ".env.example", "DATABASE_URL")
        assert parse_database_name(root_db) == parse_database_name(ai_db)

    def test_ai_service_example_uses_raivan_global(self) -> None:
        ai_db = _read_env_value(REPO_ROOT / "ai-service" / ".env.example", "DATABASE_URL")
        assert parse_database_name(ai_db) == "raivan_global"
