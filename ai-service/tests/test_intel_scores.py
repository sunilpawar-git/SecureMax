"""Phase 1A tests — IntelScores model, constants, and ProcessedArticle extension."""

import pytest
from pydantic import ValidationError

from newsletter.constants import AUDIENCE_SEGMENTS, INTEL_SCORE_WEIGHTS
from scraper.models import IntelScores, ProcessedArticle


class TestIntelScoresValidation:
    def test_defaults_to_zeros(self) -> None:
        scores = IntelScores()
        assert scores.physical_security_relevance == 0.0
        assert scores.geographic_relevance == 0.0
        assert scores.threat_actionability == 0.0
        assert scores.educational_value == 0.0
        assert scores.recency_novelty == 0.0
        assert scores.audience_impact == 0.0
        assert scores.affected_segments == []

    def test_accepts_valid_range(self) -> None:
        scores = IntelScores(
            physical_security_relevance=0.0,
            geographic_relevance=0.5,
            threat_actionability=1.0,
        )
        assert scores.geographic_relevance == 0.5
        assert scores.threat_actionability == 1.0

    def test_rejects_below_zero(self) -> None:
        with pytest.raises(ValidationError):
            IntelScores(physical_security_relevance=-0.1)

    def test_rejects_above_one(self) -> None:
        with pytest.raises(ValidationError):
            IntelScores(geographic_relevance=1.01)

    def test_filters_invalid_segments(self) -> None:
        scores = IntelScores(affected_segments=["hni", "bogus", "enterprise"])
        assert "hni" in scores.affected_segments
        assert "enterprise" in scores.affected_segments
        assert "bogus" not in scores.affected_segments

    def test_accepts_all_valid_segments(self) -> None:
        scores = IntelScores(affected_segments=list(AUDIENCE_SEGMENTS))
        assert len(scores.affected_segments) == len(AUDIENCE_SEGMENTS)


class TestProcessedArticleExtension:
    def test_intel_scores_optional_default_none(self) -> None:
        article = ProcessedArticle(
            title="T",
            url="https://example.com",
            content_hash="h",
            summary="S",
            domain_tags=["CPP-01"],
            industry_tags=["general"],
            source="test",
        )
        assert article.intel_scores is None

    def test_intel_scores_accepted(self) -> None:
        scores = IntelScores(physical_security_relevance=0.9)
        article = ProcessedArticle(
            title="T",
            url="https://example.com",
            content_hash="h",
            summary="S",
            domain_tags=["CPP-01"],
            industry_tags=["general"],
            source="test",
            intel_scores=scores,
        )
        assert article.intel_scores is not None
        assert article.intel_scores.physical_security_relevance == 0.9

    def test_backward_compat_without_scores(self) -> None:
        """Existing code constructing ProcessedArticle without intel_scores must still work."""
        article = ProcessedArticle(
            title="T",
            url="https://example.com",
            content_hash="h",
            summary="S",
            domain_tags=["CPP-07"],
            industry_tags=["general"],
            source="Src (rss)",
            relevance_score=0.3,
            tagged_by_gemini=False,
        )
        assert article.relevance_score == 0.3
        assert article.intel_scores is None


class TestNewsletterConstants:
    def test_weights_sum_to_one(self) -> None:
        total = sum(INTEL_SCORE_WEIGHTS.values())
        assert abs(total - 1.0) < 1e-9, f"Weights sum to {total}, expected 1.0"

    def test_all_weight_keys_match_intel_scores_fields(self) -> None:
        score_fields = set(IntelScores.model_fields.keys()) - {"affected_segments"}
        weight_keys = set(INTEL_SCORE_WEIGHTS.keys())
        assert weight_keys == score_fields

    def test_audience_segments_non_empty(self) -> None:
        assert len(AUDIENCE_SEGMENTS) >= 2
