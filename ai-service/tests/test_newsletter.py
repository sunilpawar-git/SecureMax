"""
Newsletter synthesis, HTML rendering, and draft route tests.
Intent: Gemini synthesizes the newsletter (Rule 5: judgment), code handles
parsing/escaping/persistence (determinism). GeminiError must produce
deterministic fallback content citing real articles — never a 500.
Scraped article text is untrusted: all HTML outputs must escape it.
"""

import json
from unittest.mock import AsyncMock

import pytest

from gemini_client import GeminiError
from newsletter.render import build_newsletter_html
from newsletter.synthesis import synthesize_newsletter_pipeline
from tests.conftest import _DSN, TEST_SCHEMA, _TestPool, run_db

_ARTICLES = [
    {
        "id": "ti-1",
        "title": "Warehouse breach via tailgating",
        "summary": "Attackers tailgated through an unmanned dock door.",
        "domain_tags": ["CPP-01"],
        "affected_segments": ["hni", "enterprise"],
    },
    {
        "id": "ti-2",
        "title": "Data centre badge cloning incident",
        "summary": "Cloned access badges used to enter a server hall.",
        "domain_tags": ["CPP-05"],
        "affected_segments": ["enterprise"],
    },
]


class _FailingGemini:
    async def generate(self, prompt, model=None):
        raise GeminiError("boom")

    async def embed(self, text, model=None):
        raise GeminiError("boom")


async def test_synthesis_parses_gemini_json():
    """Full pipeline returns NewsletterContent with Gemini-driven content."""
    cluster_response = json.dumps([
        {
            "theme_title": "Access Control Failures",
            "theme_summary": "Tailgating and badge cloning.",
            "article_ids": ["ti-1", "ti-2"],
            "primary_domain": "CPP-01",
        }
    ])
    enrich_response = json.dumps({
        "situation": "Two access control breaches.",
        "assessment": "Physical access controls are weak.",
        "implications": "Broad facility exposure.",
        "recommendation": "Man the docks and audit badge systems.",
        "cpp_citation": "CPP-01 §4.1",
        "segment_impact": {
            "hni": "Review home perimeter access.",
            "enterprise": "Audit badge provisioning.",
            "critical_infrastructure": "Enforce dual-person access.",
        },
    })
    compose_response = json.dumps({
        "title": "This Week in Physical Security",
        "executive_summary": "Two incidents stood out this week.",
        "intelligence_briefing": "Full briefing content goes here.",
        "full_analysis": "Deep analysis with CPP citations.",
        "commanders_note": "Stay vigilant.",
        "cta_soft": "Book an audit.",
        "cta_audit_link": "/security-audit",
    })
    gemini = AsyncMock()
    gemini.generate = AsyncMock(
        side_effect=[cluster_response, enrich_response, compose_response]
    )
    content = await synthesize_newsletter_pipeline(_ARTICLES, gemini=gemini)
    assert content.title == "This Week in Physical Security"
    assert content.themes[0].cpp_domain == "CPP-01"
    assert content.cta_soft == "Book an audit."
    assert content.intelligence_briefing == "Full briefing content goes here."


async def test_synthesis_fallback_produces_valid_content_on_gemini_error():
    """Each pass has its own fallback — a failing Gemini still produces content."""
    content = await synthesize_newsletter_pipeline(_ARTICLES, gemini=_FailingGemini())
    assert content.title
    assert content.cta_soft
    assert len(content.themes) > 0


def test_html_contains_title_items_and_brand():
    html = build_newsletter_html(
        {
            "title": "Weekly Threat Digest",
            "intro": "Intro text",
            "items": [{"headline": "H1", "takeaway": "T1", "domain": "CPP-01"}],
            "cta": "Call us.",
        }
    )
    assert "Weekly Threat Digest" in html
    assert "H1" in html
    assert "CPP-01" in html
    assert "Raivan Global" in html


def test_html_escapes_untrusted_article_content():
    html = build_newsletter_html(
        {
            "title": '<script>alert("x")</script>',
            "intro": "ok",
            "items": [{"headline": "<img src=x onerror=1>", "takeaway": "ok", "domain": "CPP-01"}],
            "cta": "ok",
        }
    )
    assert "<script>" not in html
    assert "<img src=x" not in html
    assert "&lt;script&gt;" in html


def _seed_article(db_conn, article_id: str, title: str) -> None:
    run_db(
        db_conn.execute(
            """
            INSERT INTO threat_intel
                (id, title, url, content_hash, summary, domain_tags, industry_tags,
                 relevance_score)
            VALUES ($1, $2, $3, $4, $5, '["CPP-01"]', '["general"]', 0.8)
            """,
            article_id,
            title,
            f"https://example.com/{article_id}",
            f"hash-{article_id}",
            f"Summary of {title}",
        )
    )


def test_draft_route_creates_newsletter_row(test_client, db_conn, monkeypatch):
    """End-to-end: draft → newsletter row with image bytes and cited ids."""
    _seed_article(db_conn, "ti-nl-1", "Perimeter fence cut at logistics hub")

    async def fake_render(html, **kwargs):
        assert "Raivan Global" in html
        return b"png-bytes"

    monkeypatch.setattr("routers.newsletter.render_png", fake_render)

    original_pool = test_client.app.state.pool
    original_gemini = getattr(test_client.app.state, "gemini", None)
    test_client.app.state.pool = _TestPool(_DSN, TEST_SCHEMA)
    test_client.app.state.gemini = _FailingGemini()  # fallback path, no live Gemini
    try:
        resp = test_client.post("/newsletter/draft", json={"days": 7})
    finally:
        test_client.app.state.pool = original_pool
        test_client.app.state.gemini = original_gemini

    assert resp.status_code == 201
    body = resp.json()
    assert body["newsletter_id"]
    assert body["title"]

    row = run_db(
        db_conn.fetchrow("SELECT * FROM newsletters WHERE id = $1", body["newsletter_id"])
    )
    assert row is not None
    assert row["status"] == "draft"
    assert bytes(row["image_png"]) == b"png-bytes"
    assert "ti-nl-1" in json.loads(row["article_ids"])
    assert row["body_markdown"]
    assert row["executive_summary"]
    assert row["email_html"]
    assert row["whatsapp_text"]
    assert row["website_html"]


def test_draft_route_fails_loud_when_no_articles(test_client):
    """Rule 12: an empty intel window is a 422, not a silent empty newsletter."""
    original_pool = test_client.app.state.pool
    test_client.app.state.pool = _TestPool(_DSN, TEST_SCHEMA)
    try:
        resp = test_client.post("/newsletter/draft", json={"days": 7})
    finally:
        test_client.app.state.pool = original_pool

    assert resp.status_code == 422


@pytest.mark.parametrize("days", [0, 32])
def test_draft_route_rejects_out_of_range_window(test_client, days):
    resp = test_client.post("/newsletter/draft", json={"days": days})
    assert resp.status_code == 422
