"""Tests for CPP admin ingestion endpoint — delta processing logic."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers.cpp_admin import router


@pytest.fixture()
def app():
    test_app = FastAPI()
    test_app.include_router(router)
    test_app.state.pool = MagicMock()
    return test_app


@pytest.fixture()
def client(app):
    return TestClient(app)


class TestIngestEndpoint:
    def test_rejects_invalid_domain(self, client) -> None:
        with patch("routers.cpp_admin.get_db") as mock_dep:
            mock_conn = AsyncMock()
            mock_dep.return_value = mock_conn
            response = client.post(
                "/admin/cpp/ingest",
                data={"domain": "INVALID"},
                files={"file": ("test.md", b"# Test\n\nContent.", "text/markdown")},
            )
        assert response.status_code == 400
        assert "Invalid domain" in response.json()["detail"]

    def test_returns_empty_for_blank_file(self, client) -> None:
        with patch("routers.cpp_admin.get_db") as mock_dep:
            mock_conn = AsyncMock()
            mock_dep.return_value = mock_conn
            response = client.post(
                "/admin/cpp/ingest",
                data={"domain": "CPP-01"},
                files={"file": ("empty.md", b"", "text/markdown")},
            )
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "empty"
        assert body["inserted"] == 0

    def test_delta_logic_identifies_existing_chunks(self) -> None:
        from chunker import chunk_document

        text = "# Title\n\nSome content for testing."
        chunks = chunk_document(text, "CPP-01")
        assert len(chunks) >= 1

        existing_hashes = {chunks[0]["content_hash"]}
        new_chunks = [c for c in chunks if c["content_hash"] not in existing_hashes]
        assert len(new_chunks) == 0  # all chunks exist = all skipped


class TestStatsEndpoint:
    def test_stats_returns_domain_counts(self, client) -> None:
        with patch("routers.cpp_admin.get_db") as mock_dep:
            mock_conn = AsyncMock()
            mock_conn.fetch = AsyncMock(
                return_value=[
                    {"domain": "CPP-01", "count": 42},
                    {"domain": "CPP-05", "count": 18},
                ]
            )
            mock_dep.return_value = mock_conn

            # Override dependency
            from routers.cpp_admin import router as cpp_router

            app = FastAPI()
            app.include_router(cpp_router)
            app.state.pool = MagicMock()
            app.dependency_overrides[
                __import__("db", fromlist=["get_db"]).get_db
            ] = lambda: mock_conn
            test_client = TestClient(app)

            response = test_client.get("/admin/cpp/stats")

        assert response.status_code == 200
        body = response.json()
        assert "domains" in body
        assert "total" in body


class TestDeltaLogic:
    def test_content_hash_is_deterministic(self) -> None:
        from chunker import content_hash

        h1 = content_hash("test content")
        h2 = content_hash("test content")
        assert h1 == h2

    def test_different_content_different_hash(self) -> None:
        from chunker import content_hash

        h1 = content_hash("content A")
        h2 = content_hash("content B")
        assert h1 != h2
