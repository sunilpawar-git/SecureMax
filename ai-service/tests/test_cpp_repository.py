"""Tests for cpp_repository — pgvector similarity search with mocked Gemini."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from config import get_settings
from cpp_repository import get_relevant_chunks
from gemini_client import GeminiClient, GeminiError
from tests.conftest import run_db

_settings = get_settings()


def _make_mock_gemini(embed_return=None, embed_side_effect=None) -> MagicMock:
    """Create a mock GeminiClient with controllable embed behaviour."""
    mock = MagicMock(spec=GeminiClient)
    if embed_side_effect:
        mock.embed = AsyncMock(side_effect=embed_side_effect)
    else:
        mock.embed = AsyncMock(return_value=embed_return or [0.1] * 3072)
    return mock


class TestGetRelevantChunks:
    def test_returns_list_of_chunks(self, db_conn):
        mock_gemini = _make_mock_gemini()
        results = run_db(
            get_relevant_chunks("physical security", db_conn, _settings, gemini=mock_gemini)
        )
        assert isinstance(results, list)
        for r in results:
            assert hasattr(r, "id")
            assert hasattr(r, "domain")
            assert hasattr(r, "section")
            assert hasattr(r, "chunk_text")

    def test_respects_top_k(self, db_conn):
        mock_gemini = _make_mock_gemini()
        results = run_db(
            get_relevant_chunks("test", db_conn, _settings, top_k=2, gemini=mock_gemini)
        )
        assert len(results) <= 2

    def test_results_include_domain(self, db_conn):
        mock_gemini = _make_mock_gemini()
        results = run_db(
            get_relevant_chunks("access control", db_conn, _settings, gemini=mock_gemini)
        )
        for r in results:
            assert r.domain.startswith("CPP-")

    def test_handles_embed_failure_gracefully(self, db_conn):
        mock_gemini = _make_mock_gemini(embed_side_effect=GeminiError("API down"))
        results = run_db(get_relevant_chunks("test", db_conn, _settings, gemini=mock_gemini))
        assert results == []

    def test_empty_db_returns_empty(self, db_conn):
        """When the test schema has no cpp_chunks, returns empty list."""
        mock_gemini = _make_mock_gemini()
        results = run_db(get_relevant_chunks("test", db_conn, _settings, gemini=mock_gemini))
        assert results == []


class TestGetRelevantChunksIntegration:
    @pytest.mark.integration
    def test_live_db_returns_results(self):
        """Integration test against real cpp_chunks in public schema."""
        import asyncio

        import asyncpg

        from config import get_settings

        settings = get_settings()
        dsn = settings.database_url.replace("+asyncpg", "").split("?")[0]

        mock_gemini = _make_mock_gemini()

        async def _run():
            conn = await asyncpg.connect(dsn)
            try:
                return await get_relevant_chunks(
                    "perimeter security", conn, settings, gemini=mock_gemini
                )
            finally:
                await conn.close()

        loop = asyncio.new_event_loop()
        try:
            results = loop.run_until_complete(_run())
        finally:
            loop.close()

        assert len(results) > 0
        assert all(r.domain.startswith("CPP-") for r in results)
