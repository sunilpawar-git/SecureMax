"""Tests for the on-site audit checklist generator."""

import pytest

from report.checklist import generate_checklist


@pytest.fixture
def sample_findings():
    return [
        {
            "domain": "CPP-01",
            "severity": "critical",
            "question": "What perimeter protection exists?",
            "answer": "None",
            "risk_impact": "No perimeter — intruders face zero deterrent",
            "cpp_citation": {"domain": "CPP-01", "section": "4 Ds Framework"},
        },
        {
            "domain": "CPP-05",
            "severity": "high",
            "question": "Is WiFi segregated?",
            "answer": "No — same network",
            "risk_impact": "Flat network enables lateral movement",
        },
        {
            "domain": "CPP-06",
            "severity": "medium",
            "question": "Are staff vetted?",
            "answer": "Informal only",
            "risk_impact": "Insider threat unmitigated",
        },
        {
            "domain": "CPP-03",
            "severity": "low",
            "question": "Is training conducted?",
            "answer": "Yes",
            "risk_impact": "",
        },
    ]


class TestGenerateChecklist:
    def test_only_critical_and_high_produce_items(self, sample_findings):
        items = generate_checklist(sample_findings)
        severities = {item["severity"] for item in items}
        assert severities == {"critical", "high"}

    def test_items_sorted_critical_first(self, sample_findings):
        items = generate_checklist(sample_findings)
        assert items[0]["severity"] == "critical"
        assert items[1]["severity"] == "high"

    def test_item_has_required_fields(self, sample_findings):
        items = generate_checklist(sample_findings)
        required = {"id", "domain", "severity", "action", "reference", "checked"}
        for item in items:
            assert required.issubset(item.keys())

    def test_checked_defaults_false(self, sample_findings):
        items = generate_checklist(sample_findings)
        for item in items:
            assert item["checked"] is False

    def test_action_derived_from_risk_impact(self, sample_findings):
        items = generate_checklist(sample_findings)
        assert "VERIFY:" in items[0]["action"]
        assert "zero deterrent" in items[0]["action"].lower()

    def test_reference_includes_domain(self, sample_findings):
        items = generate_checklist(sample_findings)
        assert "CPP-01" in items[0]["reference"]

    def test_reference_includes_section_when_available(self, sample_findings):
        items = generate_checklist(sample_findings)
        assert "4 Ds Framework" in items[0]["reference"]

    def test_empty_findings_returns_empty(self):
        assert generate_checklist([]) == []

    def test_all_low_medium_returns_empty(self):
        findings = [
            {"domain": "CPP-01", "severity": "low", "question": "Q", "answer": "A"},
            {"domain": "CPP-02", "severity": "medium", "question": "Q", "answer": "A"},
        ]
        assert generate_checklist(findings) == []

    def test_id_starts_with_chk(self, sample_findings):
        items = generate_checklist(sample_findings)
        for item in items:
            assert item["id"].startswith("chk_")

    def test_ids_are_stable_across_calls(self, sample_findings):
        """IDs must be deterministic — same findings produce same IDs every time."""
        items_a = generate_checklist(sample_findings)
        items_b = generate_checklist(sample_findings)
        assert [i["id"] for i in items_a] == [i["id"] for i in items_b]

    def test_ids_are_unique_per_finding(self, sample_findings):
        """No two items should share an ID."""
        items = generate_checklist(sample_findings)
        ids = [i["id"] for i in items]
        assert len(ids) == len(set(ids))

    def test_ids_do_not_have_gaps_when_filtered(self):
        """Filtered-out medium/low findings must not cause ID gaps in output."""
        findings = [
            {"domain": "CPP-06", "severity": "medium", "question": "Skipped", "answer": "A"},
            {
                "domain": "CPP-01",
                "severity": "critical",
                "question": "Perimeter check?",
                "answer": "None",
            },
            {"domain": "CPP-05", "severity": "low", "question": "Skipped2", "answer": "B"},
            {
                "domain": "CPP-02",
                "severity": "high",
                "question": "Leadership review?",
                "answer": "None",
            },
        ]
        items = generate_checklist(findings)
        assert len(items) == 2
        # IDs must be derived from domain+question, not from enumerate index
        ids = [i["id"] for i in items]
        assert all(id_.startswith("chk_") for id_ in ids)
        assert ids[0] != ids[1]
