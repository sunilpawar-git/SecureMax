"""Phase 1B tests — gatekeeper scoring: composite score, quality gate, Gemini + fallback."""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from gemini_client import GeminiError
from newsletter.constants import INTEL_SCORE_WEIGHTS, NEWSLETTER_QUALITY_THRESHOLD
from scraper.gatekeeper import (
    compute_composite_score,
    fallback_scores,
    passes_quality_gate,
    score_article,
)
from scraper.models import IntelScores, RawArticle


def _make_article(title: str = "Test", content: str = "Content") -> RawArticle:
    return RawArticle(
        url="https://example.com/test",
        title=title,
        content=content,
        source_name="Test",
        source_tier="rss",
    )


class TestCompositeScore:
    def test_all_zeros(self) -> None:
        scores = IntelScores()
        assert compute_composite_score(scores) == 0.0

    def test_all_ones(self) -> None:
        scores = IntelScores(
            physical_security_relevance=1.0,
            geographic_relevance=1.0,
            threat_actionability=1.0,
            educational_value=1.0,
            recency_novelty=1.0,
            audience_impact=1.0,
        )
        assert abs(compute_composite_score(scores) - 1.0) < 1e-9

    def test_weighted_correctly(self) -> None:
        scores = IntelScores(physical_security_relevance=1.0)
        expected = INTEL_SCORE_WEIGHTS["physical_security_relevance"]
        assert abs(compute_composite_score(scores) - expected) < 1e-9

    def test_mixed_scores(self) -> None:
        scores = IntelScores(
            physical_security_relevance=0.8,
            geographic_relevance=0.6,
            threat_actionability=0.7,
        )
        expected = (0.8 * 0.25) + (0.6 * 0.20) + (0.7 * 0.20)
        assert abs(compute_composite_score(scores) - expected) < 1e-9


class TestQualityGate:
    def test_passes_at_threshold(self) -> None:
        scores = IntelScores(
            physical_security_relevance=1.0,
            geographic_relevance=1.0,
            threat_actionability=1.0,
        )
        composite = compute_composite_score(scores)
        assert composite >= NEWSLETTER_QUALITY_THRESHOLD
        assert passes_quality_gate(scores)

    def test_fails_below_threshold(self) -> None:
        scores = IntelScores(
            physical_security_relevance=0.1,
            geographic_relevance=0.1,
        )
        assert not passes_quality_gate(scores)

    def test_passes_high_scores(self) -> None:
        scores = IntelScores(
            physical_security_relevance=0.9,
            geographic_relevance=0.8,
            threat_actionability=0.7,
            educational_value=0.6,
            recency_novelty=0.8,
            audience_impact=0.7,
        )
        assert passes_quality_gate(scores)

    def test_boundary_059_fails(self) -> None:
        scores = IntelScores(
            physical_security_relevance=0.59,
            geographic_relevance=0.59,
            threat_actionability=0.59,
            educational_value=0.59,
            recency_novelty=0.59,
            audience_impact=0.59,
        )
        composite = compute_composite_score(scores)
        assert composite < NEWSLETTER_QUALITY_THRESHOLD


class TestGeminiScoring:
    @pytest.mark.asyncio
    async def test_parses_valid_json(self) -> None:
        gemini = MagicMock()
        gemini.generate = AsyncMock(return_value=json.dumps({
            "physical_security_relevance": 0.9,
            "geographic_relevance": 0.7,
            "threat_actionability": 0.8,
            "educational_value": 0.6,
            "recency_novelty": 0.5,
            "audience_impact": 0.7,
            "affected_segments": ["enterprise"],
        }))

        result = await score_article(_make_article(), gemini=gemini)
        assert isinstance(result, IntelScores)
        assert result.physical_security_relevance == 0.9
        assert result.affected_segments == ["enterprise"]

    @pytest.mark.asyncio
    async def test_strips_markdown_fences(self) -> None:
        gemini = MagicMock()
        gemini.generate = AsyncMock(return_value="```json\n" + json.dumps({
            "physical_security_relevance": 0.8,
            "geographic_relevance": 0.6,
            "threat_actionability": 0.5,
            "educational_value": 0.4,
            "recency_novelty": 0.7,
            "audience_impact": 0.5,
            "affected_segments": [],
        }) + "\n```")

        result = await score_article(_make_article(), gemini=gemini)
        assert result.physical_security_relevance == 0.8

    @pytest.mark.asyncio
    async def test_fallback_on_gemini_error(self) -> None:
        gemini = MagicMock()
        gemini.generate = AsyncMock(side_effect=GeminiError("boom"))

        article = _make_article(
            title="CCTV breach in Mumbai warehouse",
            content="Physical security breach at a Mumbai warehouse. CCTV was bypassed.",
        )
        result = await score_article(article, gemini=gemini)
        assert isinstance(result, IntelScores)
        assert result.physical_security_relevance > 0

    @pytest.mark.asyncio
    async def test_fallback_on_bad_json(self) -> None:
        gemini = MagicMock()
        gemini.generate = AsyncMock(return_value="not json at all")

        result = await score_article(_make_article(), gemini=gemini)
        assert isinstance(result, IntelScores)


class TestFallbackScores:
    def test_physical_security_keywords_score_high(self) -> None:
        article = _make_article(
            content="CCTV surveillance was bypassed in a physical security breach."
        )
        scores = fallback_scores(article)
        assert scores.physical_security_relevance > 0.2

    def test_irrelevant_content_scores_low(self) -> None:
        article = _make_article(
            title="Tech startup raises funding",
            content="A software company announced a new product launch today.",
        )
        scores = fallback_scores(article)
        assert scores.physical_security_relevance == 0.0

    def test_india_terms_boost_geographic(self) -> None:
        article = _make_article(
            content="A security incident occurred at a Mumbai corporate campus."
        )
        scores = fallback_scores(article)
        assert scores.geographic_relevance > 0

    def test_no_india_terms_zero_geographic(self) -> None:
        article = _make_article(content="A warehouse in Texas was breached.")
        scores = fallback_scores(article)
        assert scores.geographic_relevance == 0.0

    def test_recency_novelty_always_one(self) -> None:
        scores = fallback_scores(_make_article())
        assert scores.recency_novelty == 1.0

    def test_enterprise_segment_detected(self) -> None:
        article = _make_article(
            content="Corporate office campus security was compromised."
        )
        scores = fallback_scores(article)
        assert "enterprise" in scores.affected_segments

    def test_hni_segment_detected(self) -> None:
        article = _make_article(
            content="The family residence estate perimeter was breached."
        )
        scores = fallback_scores(article)
        assert "hni" in scores.affected_segments

    def test_critical_infrastructure_segment_detected(self) -> None:
        article = _make_article(
            content="Critical power infrastructure telecom facility was targeted."
        )
        scores = fallback_scores(article)
        assert "critical_infrastructure" in scores.affected_segments

    def test_segments_validated_against_allowed_list(self) -> None:
        scores = fallback_scores(_make_article())
        from newsletter.constants import AUDIENCE_SEGMENTS
        for seg in scores.affected_segments:
            assert seg in AUDIENCE_SEGMENTS


class TestFallbackScoresExpandedThreats:
    """Fire, stampede, drone, kidnapping articles must score HIGH on physical_security_relevance."""

    def test_fire_incident_scores_high(self) -> None:
        article = _make_article(
            title="Delhi hotel fire kills 21",
            content=(
                "A fire at Flourish Stay in Malviya Nagar Delhi killed 21 people. "
                "No fire safety certificate."
            ),
        )
        scores = fallback_scores(article)
        assert scores.physical_security_relevance >= 0.3
        assert scores.geographic_relevance > 0

    def test_stampede_scores_high(self) -> None:
        article = _make_article(
            title="Stampede at Mumbai event kills 5",
            content="Overcrowding and stampede at a Mumbai concert. Crowd management failure.",
        )
        scores = fallback_scores(article)
        assert scores.physical_security_relevance >= 0.3

    def test_drone_attack_scores_high(self) -> None:
        article = _make_article(
            title="Drone attack on airport",
            content="Counter-drone systems failed to stop a drone attack on the airport.",
        )
        scores = fallback_scores(article)
        assert scores.physical_security_relevance >= 0.15

    def test_kidnapping_scores_high(self) -> None:
        article = _make_article(
            title="Executive kidnapping in Noida",
            content="Ransom demand after executive kidnapping near Noida expressway.",
        )
        scores = fallback_scores(article)
        assert scores.physical_security_relevance >= 0.15
        assert scores.geographic_relevance > 0

    def test_building_collapse_scores_high(self) -> None:
        article = _make_article(
            title="Building collapse in Surat kills 7",
            content="Building collapse due to structural failure in Surat. Emergency exit blocked.",
        )
        scores = fallback_scores(article)
        assert scores.physical_security_relevance >= 0.3

    def test_terrorism_scores_high(self) -> None:
        article = _make_article(
            title="Bomb blast at railway station",
            content=(
                "Terrorism suspected in bomb blast at railway station. "
                "Active shooter neutralized."
            ),
        )
        scores = fallback_scores(article)
        assert scores.physical_security_relevance >= 0.3
