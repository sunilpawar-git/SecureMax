"""Tests for report/enrichment.py — CPP citation + threat intel linking."""

import json
from unittest.mock import AsyncMock, MagicMock

from config import get_settings
from gemini_client import GeminiClient
from report.enrichment import (
    enrich_findings_with_cpp,
    enrich_findings_with_threat_intel,
)
from tests.conftest import run_db

_settings = get_settings()


def _sample_findings() -> list[dict]:
    return [
        {
            "domain": "CPP-01",
            "domain_name": "Physical Security",
            "question": "Is the perimeter secured?",
            "answer": "No",
            "severity": "critical",
            "recommendation": "Secure the perimeter.",
        },
        {
            "domain": "CPP-05",
            "domain_name": "Information Security",
            "question": "Is data encrypted?",
            "answer": "Never",
            "severity": "high",
            "recommendation": "Encrypt data.",
        },
    ]


def _mock_gemini(embed_return=None) -> MagicMock:
    mock = MagicMock(spec=GeminiClient)
    mock.embed = AsyncMock(return_value=embed_return or [0.1] * 3072)
    return mock


class TestEnrichFindingsWithCpp:
    def test_findings_get_cpp_citation_attached(self, db_conn) -> None:
        """With CPP chunks in DB, findings should get citations."""
        _seed_test_chunk(db_conn, "CPP-01", "Perimeter", "Perimeter fencing is essential.")
        gemini = _mock_gemini()
        findings = _sample_findings()
        enriched = run_db(
            enrich_findings_with_cpp(findings, db_conn, _settings, gemini=gemini)
        )
        cpp01_finding = next(f for f in enriched if f["domain"] == "CPP-01")
        assert cpp01_finding.get("cpp_citation") is not None
        assert cpp01_finding["cpp_citation"]["domain"] == "CPP-01"
        assert "excerpt" in cpp01_finding["cpp_citation"]

    def test_empty_db_returns_findings_without_citations(self, db_conn) -> None:
        gemini = _mock_gemini()
        findings = _sample_findings()
        enriched = run_db(
            enrich_findings_with_cpp(findings, db_conn, _settings, gemini=gemini)
        )
        for f in enriched:
            assert f.get("cpp_citation") is None

    def test_does_not_mutate_original(self, db_conn) -> None:
        gemini = _mock_gemini()
        findings = _sample_findings()
        originals = [dict(f) for f in findings]
        run_db(enrich_findings_with_cpp(findings, db_conn, _settings, gemini=gemini))
        assert findings == originals

    def test_handles_embed_failure_gracefully(self, db_conn) -> None:
        gemini = MagicMock(spec=GeminiClient)
        gemini.embed = AsyncMock(side_effect=RuntimeError("API down"))
        findings = _sample_findings()
        enriched = run_db(
            enrich_findings_with_cpp(findings, db_conn, _settings, gemini=gemini)
        )
        assert len(enriched) == len(findings)
        for f in enriched:
            assert f.get("cpp_citation") is None


class TestEnrichFindingsWithThreatIntel:
    def test_returns_articles_matching_domain(self, db_conn) -> None:
        _seed_test_threat_intel(db_conn, "CPP-01", "Perimeter breach at warehouse")
        findings = _sample_findings()
        articles = run_db(enrich_findings_with_threat_intel(findings, db_conn))
        assert len(articles) >= 1
        assert any("CPP-01" in json.dumps(a.get("domain_tags", [])) for a in articles)

    def test_empty_threat_intel_returns_empty(self, db_conn) -> None:
        findings = _sample_findings()
        articles = run_db(enrich_findings_with_threat_intel(findings, db_conn))
        assert articles == []

    def test_soft_deleted_articles_excluded(self, db_conn) -> None:
        _seed_test_threat_intel(
            db_conn, "CPP-01", "Deleted article", soft_deleted=True
        )
        findings = _sample_findings()
        articles = run_db(enrich_findings_with_threat_intel(findings, db_conn))
        assert articles == []

    def test_deduplicates_across_domains(self, db_conn) -> None:
        _seed_test_threat_intel(db_conn, "CPP-01", "Shared article", article_id="shared-1")
        findings = _sample_findings()
        articles = run_db(enrich_findings_with_threat_intel(findings, db_conn))
        urls = [a["url"] for a in articles]
        assert len(urls) == len(set(urls))

    def test_limits_articles(self, db_conn) -> None:
        for i in range(10):
            _seed_test_threat_intel(
                db_conn, "CPP-01", f"Article {i}", article_id=f"art-{i}"
            )
        findings = _sample_findings()
        articles = run_db(
            enrich_findings_with_threat_intel(findings, db_conn, max_articles=5)
        )
        assert len(articles) <= 5


def _seed_test_chunk(db_conn, domain: str, section: str, text: str) -> None:
    import hashlib

    content_hash = hashlib.sha256(text.encode()).hexdigest()
    embedding = [0.1] * 3072
    embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"
    run_db(
        db_conn.execute(
            """
            INSERT INTO cpp_chunks (id, domain, section, chunk_text, embedding, content_hash)
            VALUES ($1, $2, $3, $4, $5::vector, $6)
            ON CONFLICT (content_hash) DO NOTHING
            """,
            f"chunk-{content_hash[:8]}",
            domain,
            section,
            text,
            embedding_str,
            content_hash,
        )
    )


def _seed_test_threat_intel(
    db_conn,
    domain: str,
    title: str,
    *,
    article_id: str | None = None,
    soft_deleted: bool = False,
) -> None:
    import hashlib

    aid = article_id or hashlib.sha256(title.encode()).hexdigest()[:12]
    url = f"https://example.com/{aid}"
    content_hash = hashlib.sha256(title.encode()).hexdigest()
    run_db(
        db_conn.execute(
            """
            INSERT INTO threat_intel
                (id, title, url, content_hash, summary, domain_tags, industry_tags,
                 source, soft_deleted)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (url) DO NOTHING
            """,
            aid,
            title,
            url,
            content_hash,
            f"Summary of {title}",
            json.dumps([domain]),
            json.dumps(["physical_security"]),
            "test",
            soft_deleted,
        )
    )
