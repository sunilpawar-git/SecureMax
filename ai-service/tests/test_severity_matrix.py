"""Tests for severity matrix loader — TDD: written before implementation."""

import pytest

from config import CPP_DOMAINS, SEVERITY_ORDER


class TestSeverityMatrixLoading:
    def test_matrix_loads_valid_yaml(self) -> None:
        from severity_loader import load_severity_matrix

        matrix = load_severity_matrix()
        assert isinstance(matrix, dict)
        assert len(matrix) > 0

    def test_matrix_domains_are_valid(self) -> None:
        from severity_loader import load_severity_matrix

        matrix = load_severity_matrix()
        for domain in matrix:
            assert domain in CPP_DOMAINS, f"Invalid domain in matrix: {domain}"

    def test_matrix_severities_are_valid(self) -> None:
        from severity_loader import load_severity_matrix

        matrix = load_severity_matrix()
        for domain, questions in matrix.items():
            for node_id, config in questions.items():
                sev = config.get("severity_override")
                assert sev in SEVERITY_ORDER, f"Invalid severity '{sev}' for {domain}/{node_id}"

    def test_matrix_rejects_invalid_domain(self, tmp_path) -> None:
        from severity_loader import validate_matrix

        bad_matrix = {"INVALID-DOMAIN": {"q1": {"severity_override": "critical"}}}
        with pytest.raises(ValueError, match="Invalid domain"):
            validate_matrix(bad_matrix)

    def test_matrix_rejects_invalid_severity(self, tmp_path) -> None:
        from severity_loader import validate_matrix

        bad_matrix = {"CPP-01": {"q1": {"severity_override": "apocalyptic"}}}
        with pytest.raises(ValueError, match="Invalid severity"):
            validate_matrix(bad_matrix)


class TestQuestionSeverityLookup:
    def test_question_severity_override_applies(self) -> None:
        from severity_loader import get_question_severity

        result = get_question_severity("CPP-01", "hni_cpp01_cctv", "No CCTV")
        assert result is not None
        severity, risk_impact = result
        assert severity == "critical"

    def test_risk_impact_returned_from_matrix(self) -> None:
        from severity_loader import get_question_severity

        result = get_question_severity("CPP-01", "hni_cpp01_cctv", "No CCTV")
        assert result is not None
        _, risk_impact = result
        assert risk_impact is not None
        assert len(risk_impact) > 10

    def test_keyword_fallback_when_unmapped(self) -> None:
        from severity_loader import get_question_severity

        result = get_question_severity("CPP-01", "unmapped_node_xyz", "no")
        assert result is None

    def test_no_match_when_answer_not_in_patterns(self) -> None:
        from severity_loader import get_question_severity

        result = get_question_severity("CPP-01", "hni_cpp01_cctv", "Yes — full coverage")
        assert result is None

    def test_empty_matrix_uses_pure_keyword_logic(self) -> None:
        from severity_loader import _reset_cache, get_question_severity

        _reset_cache()
        result = get_question_severity("CPP-99", "nonexistent", "no")
        assert result is None

    def test_case_insensitive_pattern_matching(self) -> None:
        from severity_loader import get_question_severity

        result = get_question_severity("CPP-01", "hni_cpp01_cctv", "NO CCTV")
        assert result is not None
        severity, _ = result
        assert severity == "critical"

    def test_partial_match_in_patterns(self) -> None:
        from severity_loader import get_question_severity

        result = get_question_severity("CPP-01", "hni_cpp01_cctv", "no cctv installed")
        assert result is not None
