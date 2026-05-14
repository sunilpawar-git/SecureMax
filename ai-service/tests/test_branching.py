"""
Tests for branching.py — AI-driven question branch selection.
All Gemini calls are mocked. Tests verify both AI path and fallback.
"""

import json
from unittest.mock import MagicMock, patch

from branching import determine_next_node_with_ai
from config import get_settings
from tests.conftest import run_db

_settings = get_settings()


def _node_with_edges(node_id: str, edges: list[dict], domain: str = "CPP-01") -> dict:
    return {
        "id": node_id,
        "domain": domain,
        "text": "Test question?",
        "question_type": "single_choice",
        "edges": edges,
    }


def _conditional_edges() -> list[dict]:
    return [
        {"target": "branch_a", "condition": "Yes"},
        {"target": "branch_b", "condition": "No"},
        {"target": "branch_c", "condition": "any"},
    ]


def _mock_gemini_response(target_id: str, reasoning: str = "AI chose") -> MagicMock:
    resp = MagicMock()
    resp.text = json.dumps({"target_id": target_id, "reasoning": reasoning})
    return resp


class TestAIBranching:
    @patch("branching.genai.Client")
    def test_ai_chooses_valid_branch(self, mock_cls):
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = _mock_gemini_response("branch_b")
        mock_cls.return_value = mock_client

        node = _node_with_edges("q1", _conditional_edges())
        node_map = {"q1": node, "branch_a": {}, "branch_b": {}, "branch_c": {}}

        result = run_db(
            determine_next_node_with_ai(
                node,
                "No",
                node_map,
                [],
                [],
                _settings,
                session_id="s1",
            )
        )
        assert result.target_id == "branch_b"
        assert result.ai_used is True
        assert result.reasoning == "AI chose"

    @patch("branching.genai.Client")
    def test_ai_invalid_response_falls_back(self, mock_cls):
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = _mock_gemini_response("invalid_node")
        mock_cls.return_value = mock_client

        node = _node_with_edges("q1", _conditional_edges())
        node_map = {"q1": node, "branch_a": {}, "branch_b": {}, "branch_c": {}}

        result = run_db(
            determine_next_node_with_ai(
                node,
                "No",
                node_map,
                [],
                [],
                _settings,
                session_id="s2",
            )
        )
        assert result.ai_used is False
        assert result.target_id == "branch_b"
        assert "Invalid target_id" in result.reasoning

    @patch("branching.genai.Client")
    def test_ai_timeout_falls_back(self, mock_cls):
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = TimeoutError("simulated timeout")
        mock_cls.return_value = mock_client

        node = _node_with_edges("q1", _conditional_edges())
        node_map = {"q1": node, "branch_a": {}, "branch_b": {}, "branch_c": {}}

        result = run_db(
            determine_next_node_with_ai(
                node,
                "No",
                node_map,
                [],
                [],
                _settings,
                session_id="s3",
            )
        )
        assert result.ai_used is False
        assert "timeout" in result.reasoning.lower() or "error" in result.reasoning.lower()

    def test_single_any_edge_skips_ai(self):
        edges = [{"target": "next_q", "condition": "any"}]
        node = _node_with_edges("q1", edges)
        node_map = {"q1": node, "next_q": {}}

        result = run_db(
            determine_next_node_with_ai(
                node,
                "anything",
                node_map,
                [],
                [],
                _settings,
                session_id="s4",
            )
        )
        assert result.ai_used is False
        assert result.target_id == "next_q"

    def test_multi_answer_deterministic_path(self):
        edges = [
            {"target": "branch_yes", "condition": "Yes"},
            {"target": "branch_fallback", "condition": "any"},
        ]
        node = _node_with_edges("q1", edges)
        node_map = {"q1": node, "branch_yes": {}, "branch_fallback": {}}

        result = run_db(
            determine_next_node_with_ai(
                node,
                ["Yes", "Maybe"],
                node_map,
                [],
                [],
                _settings,
                session_id="s5",
            )
        )
        assert result.ai_used is False
        assert result.target_id == "branch_yes"

    @patch("branching.genai.Client")
    def test_travel_branch_ai_path(self, mock_cls):
        """Simulate AI choosing travel branch from HNI graph."""
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = _mock_gemini_response(
            "hni_travel_domestic", "User travels frequently within India"
        )
        mock_cls.return_value = mock_client

        edges = [
            {"target": "hni_travel_domestic", "condition": "Domestic"},
            {"target": "hni_travel_international", "condition": "International"},
            {"target": "hni_travel_both", "condition": "Both"},
        ]
        node = _node_with_edges("hni_travel_module_entry", edges, domain="CPP-06")
        node_map = {
            "hni_travel_module_entry": node,
            "hni_travel_domestic": {},
            "hni_travel_international": {},
            "hni_travel_both": {},
        }

        result = run_db(
            determine_next_node_with_ai(
                node,
                "I mostly travel within India",
                node_map,
                [],
                [],
                _settings,
            )
        )
        assert result.target_id == "hni_travel_domestic"
        assert result.ai_used is True
