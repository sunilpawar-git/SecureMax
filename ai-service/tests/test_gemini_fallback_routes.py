"""
Regression tests — GeminiError must trigger the designed fallbacks,
never a 500. Root cause of the admin "LinkedIn draft service unavailable"
bug: gemini_client raises GeminiError, but the routers caught only
(OSError, ValueError, JSONDecodeError, RuntimeError), so the fallback
paths were dead code.
"""

from gemini_client import GeminiError
from tests.conftest import _DSN, TEST_SCHEMA, _TestPool, run_db


class _FailingGemini:
    """Stub that fails exactly like an exhausted-retries client (e.g. 429)."""

    async def generate(self, prompt, model=None):
        raise GeminiError("Gemini generation failed after 3 retries")

    async def embed(self, text, model=None):
        raise GeminiError("Gemini embedding failed after 3 retries")


def _seed_article(db_conn, article_id: str) -> None:
    run_db(
        db_conn.execute(
            """
            INSERT INTO threat_intel
                (id, title, url, content_hash, summary, domain_tags, industry_tags)
            VALUES ($1, $2, $3, $4, $5, '["CPP-01"]', '["general"]')
            """,
            article_id,
            "Warehouse breach via tailgating",
            f"https://example.com/{article_id}",
            f"hash-{article_id}",
            "Attackers tailgated through an unmanned dock door.",
        )
    )


def test_linkedin_draft_falls_back_on_gemini_error(test_client, db_conn):
    """GeminiError → 200 with the fallback post, not a 500."""
    _seed_article(db_conn, "ti-fallback-1")
    # Lifespan startup replaces app.state.pool/gemini — re-point both at the
    # test schema and the failing stub for the duration of this test.
    original_pool = test_client.app.state.pool
    original_gemini = getattr(test_client.app.state, "gemini", None)
    test_client.app.state.pool = _TestPool(_DSN, TEST_SCHEMA)
    test_client.app.state.gemini = _FailingGemini()
    try:
        resp = test_client.post(
            "/linkedin/draft", json={"article_ids": ["ti-fallback-1"]}
        )
    finally:
        test_client.app.state.pool = original_pool
        test_client.app.state.gemini = original_gemini

    assert resp.status_code == 200
    body = resp.json()
    assert body["post_text"]  # fallback copy present
    assert "Raivan Global" in body["post_text"]
    assert body["hashtags"]  # fallback hashtags present


def test_assistant_falls_back_on_gemini_error(test_client):
    """GeminiError in generation → 200 with the unavailable-answer copy."""
    original_gemini = getattr(test_client.app.state, "gemini", None)
    test_client.app.state.gemini = _FailingGemini()
    try:
        resp = test_client.post(
            "/assistant/ask",
            json={"question": "How do I secure a loading dock?"},
            headers={"X-User-Id": "fallback-test-user"},
        )
    finally:
        test_client.app.state.gemini = original_gemini

    assert resp.status_code == 200
    body = resp.json()
    assert "unable to generate" in body["answer"].lower()
