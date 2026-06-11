"""Validate constants.py SSOT integrity — all CPP domains have labels,
all keywords map to valid domains."""

from newsletter.constants import (
    CPP_DOMAIN_LABELS,
    DOMAIN_KEYWORD_MAP,
    INDIA_GEO_TERMS,
    PHYSICAL_SECURITY_TERMS,
)


class TestConstantsIntegrity:
    def test_all_cpp_domains_have_labels(self) -> None:
        for i in range(1, 8):
            assert f"CPP-0{i}" in CPP_DOMAIN_LABELS

    def test_domain_keyword_map_values_are_valid_domains(self) -> None:
        for keyword, domain in DOMAIN_KEYWORD_MAP.items():
            assert domain in CPP_DOMAIN_LABELS, (
                f"Keyword '{keyword}' maps to unknown domain '{domain}'"
            )

    def test_no_empty_term_sets(self) -> None:
        assert len(PHYSICAL_SECURITY_TERMS) > 20
        assert len(INDIA_GEO_TERMS) > 20

    def test_term_sets_are_lowercase(self) -> None:
        for term in PHYSICAL_SECURITY_TERMS:
            assert term == term.lower()
        for term in INDIA_GEO_TERMS:
            assert term == term.lower()

    def test_labels_are_non_empty_strings(self) -> None:
        for _code, label in CPP_DOMAIN_LABELS.items():
            assert isinstance(label, str)
            assert len(label) > 5
