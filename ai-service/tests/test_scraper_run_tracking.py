"""Tests for scraper run tracking in scraper_runs table."""

import json

import pytest

from scraper.pipeline import _complete_run, _insert_run, reset_pipeline
from tests.conftest import TEST_SCHEMA, run_db


@pytest.fixture(autouse=True)
def _reset():
    reset_pipeline()
    yield
    reset_pipeline()


class _FakePool:
    """Minimal pool mock wrapping a real asyncpg connection for tests."""

    def __init__(self, conn):
        self._conn = conn

    def acquire(self):
        return _FakeAcquire(self._conn)


class _FakeAcquire:
    def __init__(self, conn):
        self._conn = conn

    async def __aenter__(self):
        return self._conn

    async def __aexit__(self, *args):
        pass


class TestScraperRunTracking:
    """Verify _insert_run and _complete_run persist to scraper_runs table."""

    def test_insert_run_creates_row(self, db_conn) -> None:
        """_insert_run creates a row with status=running."""
        pool = _FakePool(db_conn)
        run_db(_insert_run(pool, "run-001"))

        row = run_db(
            db_conn.fetchrow(
                f"SELECT * FROM {TEST_SCHEMA}.scraper_runs WHERE id = $1",
                "run-001",
            )
        )
        assert row is not None
        assert row["status"] == "running"
        assert row["started_at"] is not None

    def test_complete_run_updates_stats(self, db_conn) -> None:
        """_complete_run sets final stats and completed_at."""
        pool = _FakePool(db_conn)
        run_db(_insert_run(pool, "run-002"))

        stats = {
            "fetched": 10,
            "stored": 7,
            "duplicates": 3,
            "errors": ["rss:timeout"],
        }
        run_db(_complete_run(pool, "run-002", stats))

        row = run_db(
            db_conn.fetchrow(
                f"SELECT * FROM {TEST_SCHEMA}.scraper_runs WHERE id = $1",
                "run-002",
            )
        )
        assert row is not None
        assert row["status"] == "completed"
        assert row["articles_found"] == 10
        assert row["articles_stored"] == 7
        assert row["duplicates"] == 3
        assert row["completed_at"] is not None
        errors = json.loads(row["errors"]) if isinstance(row["errors"], str) else row["errors"]
        assert "rss:timeout" in errors

    def test_complete_run_null_errors_when_empty(self, db_conn) -> None:
        """No errors results in NULL errors column."""
        pool = _FakePool(db_conn)
        run_db(_insert_run(pool, "run-003"))

        stats = {"fetched": 5, "stored": 5, "duplicates": 0, "errors": []}
        run_db(_complete_run(pool, "run-003", stats))

        row = run_db(
            db_conn.fetchrow(
                f"SELECT * FROM {TEST_SCHEMA}.scraper_runs WHERE id = $1",
                "run-003",
            )
        )
        assert row is not None
        assert row["errors"] is None

    def test_insert_run_graceful_on_duplicate(self, db_conn) -> None:
        """_insert_run doesn't raise on duplicate ID (graceful failure)."""
        pool = _FakePool(db_conn)
        run_db(_insert_run(pool, "run-004"))
        run_db(_insert_run(pool, "run-004"))

        count = run_db(
            db_conn.fetchval(
                f"SELECT COUNT(*) FROM {TEST_SCHEMA}.scraper_runs WHERE id = $1",
                "run-004",
            )
        )
        assert count == 1
