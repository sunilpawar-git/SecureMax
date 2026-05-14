"""Tests for cpp_repository — pgvector similarity search with mocked Gemini."""

from unittest.mock import MagicMock, patch

import pytest

from config import get_settings
from cpp_repository import get_relevant_chunks
from tests.conftest import run_db

_settings = get_settings()


def _mock_embed_result(dimensions: int = 3072) -> MagicMock:
    """Create a mock Gemini embed_content response."""
    embedding_obj = MagicMock()
    embedding_obj.values = [0.1] * dimensions
    result = MagicMock()
    result.embeddings = [embedding_obj]
    return result


class TestGetRelevantChunks:
    @patch("cpp_repository.genai.Client")
    def test_returns_list_of_chunks(self, mock_client_cls, db_conn):
        mock_client = MagicMock()
        mock_client.models.embed_content.return_value = _mock_embed_result()
        mock_client_cls.return_value = mock_client

        results = run_db(get_relevant_chunks("physical security", db_conn, _settings))
        assert isinstance(results, list)
        for r in results:
            assert hasattr(r, "id")
            assert hasattr(r, "domain")
            assert hasattr(r, "section")
            assert hasattr(r, "chunk_text")

    @patch("cpp_repository.genai.Client")
    def test_respects_top_k(self, mock_client_cls, db_conn):
        mock_client = MagicMock()
        mock_client.models.embed_content.return_value = _mock_embed_result()
        mock_client_cls.return_value = mock_client

        results = run_db(get_relevant_chunks("test", db_conn, _settings, top_k=2))
        assert len(results) <= 2

    @patch("cpp_repository.genai.Client")
    def test_results_include_domain(self, mock_client_cls, db_conn):
        mock_client = MagicMock()
        mock_client.models.embed_content.return_value = _mock_embed_result()
        mock_client_cls.return_value = mock_client

        results = run_db(get_relevant_chunks("access control", db_conn, _settings))
        for r in results:
            assert r.domain.startswith("CPP-")

    @patch("cpp_repository.genai.Client")
    def test_handles_embed_failure_gracefully(self, mock_client_cls, db_conn):
        mock_client = MagicMock()
        mock_client.models.embed_content.side_effect = RuntimeError("API down")
        mock_client_cls.return_value = mock_client

        results = run_db(get_relevant_chunks("test", db_conn, _settings))
        assert results == []

    @patch("cpp_repository.genai.Client")
    def test_empty_db_returns_empty(self, mock_client_cls, db_conn):
        """When the test schema has no cpp_chunks, returns empty list."""
        mock_client = MagicMock()
        mock_client.models.embed_content.return_value = _mock_embed_result()
        mock_client_cls.return_value = mock_client

        results = run_db(get_relevant_chunks("test", db_conn, _settings))
        assert results == []


class TestGetRelevantChunksIntegration:
    @pytest.mark.integration
    @patch("cpp_repository.genai.Client")
    def test_live_db_returns_results(self, mock_client_cls):
        """Integration test against real cpp_chunks in public schema."""
        import asyncio

        import asyncpg

        from config import get_settings

        settings = get_settings()
        dsn = settings.database_url.replace("+asyncpg", "").split("?")[0]

        mock_client = MagicMock()
        mock_client.models.embed_content.return_value = _mock_embed_result()
        mock_client_cls.return_value = mock_client

        async def _run():
            conn = await asyncpg.connect(dsn)
            try:
                results = await get_relevant_chunks("perimeter security", conn, settings)
                return results
            finally:
                await conn.close()

        loop = asyncio.new_event_loop()
        try:
            results = loop.run_until_complete(_run())
        finally:
            loop.close()

        assert len(results) > 0
        assert all(r.domain.startswith("CPP-") for r in results)
