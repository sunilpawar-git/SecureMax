"""
Test fixtures for the AI service test suite.
Uses a 'test_ai' schema in local Postgres. Each test gets a clean slate
via TRUNCATE after completion. TestClient creates per-request connections.
"""

import asyncio

import asyncpg
import pytest
from fastapi.testclient import TestClient

from config import get_settings
from db import get_db

_settings = get_settings()
_DSN = _settings.database_url.replace("+asyncpg", "").split("?")[0]

TEST_SCHEMA = "test_ai"

_DDL = f"""
CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS {TEST_SCHEMA};

SET search_path TO {TEST_SCHEMA};

DROP TABLE IF EXISTS {TEST_SCHEMA}.session_events CASCADE;
DROP TABLE IF EXISTS {TEST_SCHEMA}.audit_sessions CASCADE;
DROP TABLE IF EXISTS {TEST_SCHEMA}.cpp_chunks CASCADE;

CREATE TABLE {TEST_SCHEMA}.audit_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    track TEXT NOT NULL DEFAULT 'hni',
    status TEXT NOT NULL DEFAULT 'in_progress',
    property_type TEXT,
    facility_type TEXT,
    current_node_id TEXT,
    domain_scores JSONB,
    module_scores JSONB,
    paid BOOLEAN DEFAULT FALSE,
    razorpay_order_id TEXT UNIQUE,
    nda_accepted_at TIMESTAMPTZ,
    report_ready BOOLEAN DEFAULT FALSE,
    enterprise_report_unlocked BOOLEAN DEFAULT FALSE,
    post_download_followup_at TIMESTAMPTZ,
    downloaded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_sessions_user_status
    ON {TEST_SCHEMA}.audit_sessions(user_id, status);

CREATE TABLE {TEST_SCHEMA}.session_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL
        REFERENCES {TEST_SCHEMA}.audit_sessions(id) ON DELETE CASCADE,
    question_node_id TEXT NOT NULL,
    answer_encrypted TEXT NOT NULL,
    ai_reasoning_encrypted TEXT,
    cpp_citations JSONB,
    compliance_tags JSONB,
    domain_score_delta JSONB,
    module_score_delta JSONB,
    anonymised_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, question_node_id)
);

CREATE INDEX IF NOT EXISTS idx_test_events_session
    ON {TEST_SCHEMA}.session_events(session_id);

CREATE TABLE {TEST_SCHEMA}.cpp_chunks (
    id TEXT PRIMARY KEY,
    domain TEXT NOT NULL,
    section TEXT NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding public.vector(3072) NOT NULL,
    content_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_test_chunks_domain
    ON {TEST_SCHEMA}.cpp_chunks(domain);
"""


def _get_or_create_loop() -> asyncio.AbstractEventLoop:
    """Return a reusable event loop for fixture-level async operations.

    asyncio.run() creates a new loop each call, which causes asyncpg connections
    to be bound to a closed loop on subsequent calls. We keep a module-level
    loop instead. This is safe because fixtures run outside of the TestClient's
    internal event loop.
    """
    global _fixture_loop  # noqa: PLW0603
    if _fixture_loop is None or _fixture_loop.is_closed():
        _fixture_loop = asyncio.new_event_loop()
    return _fixture_loop


_fixture_loop: asyncio.AbstractEventLoop | None = None


def _run(coro):
    """Run a coroutine synchronously on the shared fixture event loop."""
    return _get_or_create_loop().run_until_complete(coro)


@pytest.fixture(scope="session", autouse=True)
def _setup_test_schema():
    """Create test schema and tables once per test session."""

    async def _setup():
        conn = await asyncpg.connect(_DSN)
        try:
            # Execute the entire DDL script as a single transaction
            await conn.execute(_DDL)
            # Verify the tables were created
            result = await conn.fetch(f"""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = '{TEST_SCHEMA}'
            """)
            if not result:
                raise RuntimeError(f"Test schema {TEST_SCHEMA} tables were not created")
        finally:
            await conn.close()

    _run(_setup())
    yield  # Ensure fixture stays active during all tests


@pytest.fixture(autouse=True)
def _cleanup_test_data():
    """Truncate test tables after each test for isolation."""
    yield

    async def _truncate():
        conn = await asyncpg.connect(_DSN)
        try:
            await conn.execute(f"TRUNCATE {TEST_SCHEMA}.session_events CASCADE")
            await conn.execute(f"TRUNCATE {TEST_SCHEMA}.audit_sessions CASCADE")
            await conn.execute(f"TRUNCATE {TEST_SCHEMA}.cpp_chunks CASCADE")
        finally:
            await conn.close()

    _run(_truncate())


@pytest.fixture()
def test_client():
    """TestClient with get_db overridden to connect to test schema."""
    from main import app

    async def _override_get_db():
        conn = await asyncpg.connect(_DSN)
        await conn.execute(f"SET search_path TO {TEST_SCHEMA}, public")
        try:
            yield conn
        finally:
            await conn.close()

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app, raise_server_exceptions=True) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture()
def db_conn():
    """Direct DB connection for tests needing raw access (sync-safe)."""
    conn = _run(asyncpg.connect(_DSN))
    _run(conn.execute(f"SET search_path TO {TEST_SCHEMA}, public"))
    yield conn
    _run(conn.close())


def run_db(coro):
    """Helper for sync tests to execute async repo operations."""
    return _run(coro)
