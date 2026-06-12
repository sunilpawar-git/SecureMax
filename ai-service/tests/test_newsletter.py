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
from newsletter.models import EnrichedTheme, NewsletterContent
from newsletter.render import build_newsletter_html
from newsletter.synthesis import synthesize_newsletter_pipeline
from tests.conftest import _DSN, TEST_SCHEMA, _TestPool, run_db


def _render_content(title: str, themes: list[EnrichedTheme]) -> NewsletterContent:
    """Build a minimal NewsletterContent for render tests."""
    return NewsletterContent(
        title=title,
        issue_date="11 June 2026",
        executive_summary="Test summary",
        intelligence_briefing="",
        full_analysis="",
        cta_soft="Book an audit.",
        cta_audit_link="/security-audit",
        themes=themes,
    )


def _simple_theme(
    title: str, cpp_domain: str = "CPP-01", recommendation: str = "T1"
) -> EnrichedTheme:
    return EnrichedTheme(
        theme_title=title,
        situation="Situation",
        assessment="Assessment",
        implications="Implications",
        recommendation=recommendation,
        cpp_domain=cpp_domain,
        cpp_citation="",
        source_article_ids=[],
    )

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
        "executive_summary": (
            "- Access control failures enabled tailgating at a Mumbai warehouse\n"
            "- Badge cloning incident exposed data centre in Pune"
        ),
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


def test_fallback_compose_emits_bullet_summary():
    """fallback_compose executive_summary uses bullet format (- prefix)."""
    from newsletter.composer import fallback_compose

    themes = [
        EnrichedTheme(
            theme_title="Access Failures",
            situation="Tailgating at a dock door.",
            assessment="Weak controls.",
            implications="Broad exposure.",
            recommendation="Man the docks.",
            cpp_domain="CPP-01",
        ),
        EnrichedTheme(
            theme_title="Badge Cloning",
            situation="Cloned badges used.",
            assessment="Credential risk.",
            implications="Server exposure.",
            recommendation="Audit badges.",
            cpp_domain="CPP-05",
        ),
    ]
    content = fallback_compose(themes)
    bullet_lines = [
        ln for ln in content.executive_summary.split("\n")
        if ln.startswith("- ")
    ]
    assert len(bullet_lines) == 2


def test_fallback_summary_renders_as_list():
    """Fallback exec summary renders as <ul> in the PNG HTML."""
    from newsletter.composer import fallback_compose

    themes = [
        EnrichedTheme(
            theme_title="Test Theme",
            situation="Incident occurred.",
            assessment="Assessment.",
            implications="Implications.",
            recommendation="Recommendation.",
            cpp_domain="CPP-01",
        ),
    ]
    content = fallback_compose(themes)
    html = build_newsletter_html(content)
    assert "<li>" in html


def test_html_contains_title_items_and_brand():
    content = _render_content(
        title="Weekly Threat Digest",
        themes=[_simple_theme("H1", cpp_domain="CPP-01", recommendation="T1")],
    )
    html = build_newsletter_html(content)
    assert "Weekly Threat Digest" in html
    assert "H1" in html
    # domain label is now shown (not raw CPP code)
    assert "Physical Security" in html
    assert "Raivan Global" in html


def test_html_escapes_untrusted_article_content():
    content = _render_content(
        title='<script>alert("x")</script>',
        themes=[_simple_theme('<img src=x onerror=1>')],
    )
    html = build_newsletter_html(content)
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


@pytest.mark.integration
def test_draft_route_gemini_path_png_has_quality_metadata(
    test_client, db_conn, monkeypatch
):
    """Integration: DB → synthesis (mocked Gemini) → PNG HTML quality features."""
    _seed_article(db_conn, "ti-nl-2", "Armed robbery at Mumbai jewellery store")

    cluster_response = json.dumps([
        {
            "theme_title": "Retail Perimeter Breaches",
            "theme_summary": "Physical access failures at retail sites.",
            "article_ids": ["ti-nl-2"],
            "primary_domain": "CPP-01",
        }
    ])
    enrich_response = json.dumps({
        "situation": (
            "On 10 June 2026, armed robbers breached a Mumbai jewellery store "
            "perimeter via an unmanned side entrance."
        ),
        "assessment": "Perimeter monitoring gaps enabled direct physical access.",
        "implications": "Retail HNI assets remain exposed without layered controls.",
        "recommendation": (
            "Deploy manned access points and CCTV-linked alarm escalation."
        ),
        "cpp_citation": "CPP-01 §4.2 — layered perimeter defence.",
        "segment_impact": {
            "hni": "Private residences with retail exposure need perimeter review.",
            "enterprise": "Retail campuses must audit unmanned entry points.",
            "critical_infrastructure": "",
        },
    })
    compose_response = json.dumps({
        "title": "Weekly Intelligence: Retail Perimeter Threats",
        "executive_summary": (
            "- Armed robbery at Mumbai jewellery store exposed perimeter gap\n"
            "- Unmanned side entrance enabled direct physical access"
        ),
        "intelligence_briefing": "Full SITREP briefing.",
        "full_analysis": "Deep analysis with CPP citations.",
        "commanders_note": "Perimeter discipline is non-negotiable.",
        "cta_soft": "Assess your perimeter controls.",
    })

    gemini = AsyncMock()
    gemini.generate = AsyncMock(
        side_effect=[cluster_response, enrich_response, compose_response]
    )
    gemini.embed = AsyncMock(return_value=[0.1] * 3072)

    captured_html: list[str] = []

    async def fake_render(html, **kwargs):
        captured_html.append(html)
        return b"png-quality-bytes"

    monkeypatch.setattr("routers.newsletter.render_png", fake_render)
    monkeypatch.setattr(
        "routers.newsletter.get_relevant_chunks",
        AsyncMock(return_value=[]),
    )

    original_pool = test_client.app.state.pool
    original_gemini = getattr(test_client.app.state, "gemini", None)
    test_client.app.state.pool = _TestPool(_DSN, TEST_SCHEMA)
    test_client.app.state.gemini = gemini
    try:
        resp = test_client.post("/newsletter/draft", json={"days": 7})
    finally:
        test_client.app.state.pool = original_pool
        test_client.app.state.gemini = original_gemini

    assert resp.status_code == 201
    assert captured_html, "render_png should receive HTML from draft route"

    html = captured_html[0]
    assert "Analysis of 1 sources" in html
    assert "<li>" in html
    assert "Mumbai jewellery store" in html
    assert "seg-tag" in html
    assert "HNI" in html
    assert "Enterprise" in html

    row = run_db(
        db_conn.fetchrow(
            "SELECT executive_summary FROM newsletters WHERE id = $1",
            resp.json()["newsletter_id"],
        )
    )
    assert row is not None
    assert row["executive_summary"].startswith("- ")


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
