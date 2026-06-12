"""Prompt contract tests — assert instruction fragments required by the plan.

These verify that the prompt templates contain the structural mandates
needed for incident-grounded, physical-security-biased output.
"""

from newsletter.prompts import CLUSTER_PROMPT, COMPOSE_PROMPT, ENRICH_PROMPT


class TestClusterPromptContract:
    def test_requires_physical_security_bias(self) -> None:
        t = CLUSTER_PROMPT.template
        assert "at least 2" in t
        assert "CPP-01" in t
        assert "CPP-03" in t
        assert "CPP-06" in t

    def test_discourages_tangential_themes(self) -> None:
        t = CLUSTER_PROMPT.template
        assert "economic" in t.lower() or "geopolitical" in t.lower()


class TestEnrichPromptContract:
    def test_mandates_incident_citation(self) -> None:
        t = ENRICH_PROMPT.template
        assert "cite at least one specific incident" in t

    def test_mandates_grounded_recommendation(self) -> None:
        t = ENRICH_PROMPT.template
        assert "grounded in the incident" in t


class TestComposePromptContract:
    def test_requests_bullet_format(self) -> None:
        t = COMPOSE_PROMPT.template
        assert "bullet" in t.lower()
        assert "No paragraph prose" in t
