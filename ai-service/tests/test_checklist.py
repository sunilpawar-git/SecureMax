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

    def test_id_format(self, sample_findings):
        items = generate_checklist(sample_findings)
        for item in items:
            assert item["id"].startswith("chk_")
