"""Tests for report prompt templates — validates substitution and format."""

from report.prompts import (
    BOARD_SUMMARY,
    EXECUTIVE_SUMMARY,
    FINDING_RECOMMENDATION,
    sanitize_for_prompt,
)


class TestExecutiveSummaryPrompt:
    def test_substitutes_all_vars(self) -> None:
        result = EXECUTIVE_SUMMARY.safe_substitute(
            track="hni",
            total_findings=5,
            critical_count=2,
            high_count=3,
            domains_with_gaps="CPP-01, CPP-05",
            worst_domain="CPP-01",
            worst_domain_score=25.0,
        )
        assert "$" not in result
        assert "hni" in result
        assert "CPP-01" in result

    def test_contains_professional_role(self) -> None:
        result = EXECUTIVE_SUMMARY.safe_substitute(
            track="enterprise",
            total_findings=3,
            critical_count=1,
            high_count=2,
            domains_with_gaps="CPP-03",
            worst_domain="CPP-03",
            worst_domain_score=30.0,
        )
        assert "consultant" in result.lower() or "advisor" in result.lower()

    def test_requires_structured_output(self) -> None:
        result = EXECUTIVE_SUMMARY.safe_substitute(
            track="hni",
            total_findings=5,
            critical_count=2,
            high_count=3,
            domains_with_gaps="CPP-01",
            worst_domain="CPP-01",
            worst_domain_score=20.0,
        )
        assert "paragraph" in result.lower() or "section" in result.lower()


class TestFindingRecommendationPrompt:
    def test_includes_risk_context(self) -> None:
        result = FINDING_RECOMMENDATION.safe_substitute(
            track="hni",
            domain="CPP-01",
            domain_name="Physical Security",
            question="Do you have CCTV?",
            answer="No",
            severity="critical",
            risk_impact="No visual surveillance",
            cpp_excerpt="CPP-01 requires layered detection systems",
        )
        assert "$" not in result
        assert "No visual surveillance" in result
        assert "CPP-01" in result

    def test_substitutes_without_optional_fields(self) -> None:
        result = FINDING_RECOMMENDATION.safe_substitute(
            track="hni",
            domain="CPP-01",
            domain_name="Physical Security",
            question="Q1?",
            answer="No",
            severity="high",
            risk_impact="",
            cpp_excerpt="",
        )
        assert "$" not in result


class TestBoardSummaryPrompt:
    def test_substitutes_all_vars(self) -> None:
        result = BOARD_SUMMARY.safe_substitute(
            total_findings=10,
            critical_count=3,
            compliance_gap_count=5,
            domains_with_gaps="CPP-01, CPP-03, CPP-05",
        )
        assert "$" not in result
        assert "10" in result

    def test_board_language_instruction(self) -> None:
        result = BOARD_SUMMARY.safe_substitute(
            total_findings=5,
            critical_count=2,
            compliance_gap_count=3,
            domains_with_gaps="CPP-01",
        )
        assert "board" in result.lower()


class TestSanitization:
    def test_strips_control_characters(self) -> None:
        dirty = "Hello\x00World\x01Test"
        clean = sanitize_for_prompt(dirty)
        assert "\x00" not in clean
        assert "\x01" not in clean
        assert "HelloWorldTest" in clean

    def test_truncates_long_input(self) -> None:
        long_text = "a" * 1000
        result = sanitize_for_prompt(long_text)
        assert len(result) <= 503  # 500 + "..."
        assert result.endswith("...")

    def test_preserves_valid_text(self) -> None:
        text = "Normal text with newlines\nand tabs\t"
        result = sanitize_for_prompt(text)
        assert result == text
