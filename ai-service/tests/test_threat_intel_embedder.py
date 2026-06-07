"""Tests for threat intel embedding logic."""

import json

from scraper.embedder import backfill_embeddings, embed_and_store
from tests.conftest import TEST_SCHEMA, run_db


def _insert_article(conn, article_id: str, summary: str = "test summary"):
    """Insert a bare threat_intel row for testing."""
    run_db(
        conn.execute(
            f"""
            INSERT INTO {TEST_SCHEMA}.threat_intel
                (id, title, url, content_hash, summary, domain_tags, industry_tags, source)
            VALUES ($1, 'Test Article', $2, $3, $4, $5::jsonb, $6::jsonb, 'test')
            """,
            article_id,
            f"https://example.com/{article_id}",
            f"hash_{article_id}",
            summary,
            json.dumps(["CPP-01"]),
            json.dumps(["general"]),
        )
    )


class TestEmbedAndStore:
    def test_stores_embedding_vector(self, db_conn) -> None:
        _insert_article(db_conn, "art-001")

        fake_vector = [0.1] * 3072

        async def fake_embed(text: str):
            return fake_vector

        result = run_db(embed_and_store(db_conn, "art-001", "test summary", fake_embed))
        assert result is True

        row = run_db(
            db_conn.fetchrow(
                f"SELECT embedding FROM {TEST_SCHEMA}.threat_intel WHERE id = $1",
                "art-001",
            )
        )
        assert row["embedding"] is not None

    def test_returns_false_on_embed_failure(self, db_conn) -> None:
        _insert_article(db_conn, "art-002")

        async def failing_embed(text: str):
            raise RuntimeError("API quota exceeded")

        result = run_db(embed_and_store(db_conn, "art-002", "test", failing_embed))
        assert result is False

    def test_returns_false_for_nonexistent_article(self, db_conn) -> None:
        fake_vector = [0.0] * 3072

        async def fake_embed(text: str):
            return fake_vector

        result = run_db(embed_and_store(db_conn, "nonexistent", "text", fake_embed))
        assert result is True  # UPDATE 0 rows doesn't error


class TestBackfillEmbeddings:
    def test_backfills_articles_missing_embeddings(self, db_conn) -> None:
        _insert_article(db_conn, "art-010", "summary one")
        _insert_article(db_conn, "art-011", "summary two")

        embedded_texts = []

        async def fake_embed(text: str):
            embedded_texts.append(text)
            return [0.5] * 3072

        class FakePool:
            def acquire(self):
                return _FakeAcquire(db_conn)

        result = run_db(backfill_embeddings(FakePool(), fake_embed, batch_size=10))

        assert result["embedded"] == 2
        assert result["failed"] == 0
        assert result["total_missing"] == 2
        assert len(embedded_texts) == 2

    def test_respects_batch_size(self, db_conn) -> None:
        for i in range(5):
            _insert_article(db_conn, f"art-batch-{i}")

        async def fake_embed(text: str):
            return [0.1] * 3072

        class FakePool:
            def acquire(self):
                return _FakeAcquire(db_conn)

        result = run_db(backfill_embeddings(FakePool(), fake_embed, batch_size=2))
        assert result["total_missing"] == 2
        assert result["embedded"] == 2

    def test_skips_already_embedded(self, db_conn) -> None:
        _insert_article(db_conn, "art-emb-001")

        async def fake_embed(text: str):
            return [0.9] * 3072

        run_db(embed_and_store(db_conn, "art-emb-001", "first", fake_embed))

        class FakePool:
            def acquire(self):
                return _FakeAcquire(db_conn)

        result = run_db(backfill_embeddings(FakePool(), fake_embed, batch_size=10))
        assert result["total_missing"] == 0


class _FakeAcquire:
    def __init__(self, conn):
        self._conn = conn

    async def __aenter__(self):
        return self._conn

    async def __aexit__(self, *args):
        pass
