"""
Tests for branching.py — AI-driven question branch selection.
All Gemini calls are mocked. Tests verify both AI path and fallback.

Key invariant: Gemini is ONLY called for text_input nodes with 2+ DISTINCT
non-any targets.  MCQ (single_choice / multi_choice) always uses deterministic
routing regardless of how many conditional edges exist.
"""

import json
from unittest.mock import MagicMock, patch

from branching import determine_next_node_with_ai
from config import get_settings
from tests.conftest import run_db

_settings = get_settings()


def _node(
    node_id: str,
    edges: list[dict],
    domain: str = "CPP-01",
    question_type: str = "text_input",
) -> dict:
    return {
        "id": node_id,
        "domain": domain,
        "text": "Test question?",
        "question_type": question_type,
        "edges": edges,
    }


def _text_conditional_edges() -> list[dict]:
    """Two distinct non-any targets — the only case that should invoke Gemini."""
    return [
        {"target": "branch_a", "condition": "optimistic"},
        {"target": "branch_b", "condition": "pessimistic"},
        {"target": "branch_c", "condition": "any"},
    ]


def _mock_gemini_response(target_id: str, reasoning: str = "AI chose") -> MagicMock:
    resp = MagicMock()
    resp.text = json.dumps({"target_id": target_id, "reasoning": reasoning})
    return resp


class TestAIBranching:
    @patch("branching.genai.Client")
    def test_ai_chooses_valid_branch(self, mock_cls):
        """text_input with 2 distinct non-any targets — Gemini should be called."""
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = _mock_gemini_response("branch_b")
        mock_cls.return_value = mock_client

        node = _node("q1", _text_conditional_edges())
        node_map = {"q1": node, "branch_a": {}, "branch_b": {}, "branch_c": {}}

        result = run_db(
            determine_next_node_with_ai(node, "No", node_map, [], [], _settings, session_id="s1")
        )
        assert result.target_id == "branch_b"
        assert result.ai_used is True
        assert result.reasoning == "AI chose"

    @patch("branching.genai.Client")
    def test_ai_invalid_response_falls_back(self, mock_cls):
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = _mock_gemini_response("invalid_node")
        mock_cls.return_value = mock_client

        node = _node("q1", _text_conditional_edges())
        node_map = {"q1": node, "branch_a": {}, "branch_b": {}, "branch_c": {}}

        result = run_db(
            determine_next_node_with_ai(node, "No", node_map, [], [], _settings, session_id="s2")
        )
        assert result.ai_used is False
        assert result.target_id in ("branch_a", "branch_b", "branch_c")
        assert "Invalid target_id" in result.reasoning

    @patch("branching.genai.Client")
    def test_ai_timeout_falls_back(self, mock_cls):
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = TimeoutError("simulated timeout")
        mock_cls.return_value = mock_client

        node = _node("q1", _text_conditional_edges())
        node_map = {"q1": node, "branch_a": {}, "branch_b": {}, "branch_c": {}}

        result = run_db(
            determine_next_node_with_ai(node, "No", node_map, [], [], _settings, session_id="s3")
        )
        assert result.ai_used is False
        assert "timeout" in result.reasoning.lower() or "error" in result.reasoning.lower()

    def test_single_any_edge_skips_ai(self):
        edges = [{"target": "next_q", "condition": "any"}]
        node = _node("q1", edges)
        node_map = {"q1": node, "next_q": {}}

        result = run_db(
            determine_next_node_with_ai(
                node, "anything", node_map, [], [], _settings, session_id="s4"
            )
        )
        assert result.ai_used is False
        assert result.target_id == "next_q"


class TestMCQAlwaysDeterministic:
    """MCQ nodes must NEVER invoke Gemini, regardless of edge count."""

    def test_single_choice_with_2_non_any_edges_skips_ai(self):
        """Pattern used by every HNI/enterprise branch node: 2 negative conditions
        both pointing to the same deep-dive target + an 'any' fallback.
        Before the fix, Gemini was called here and could misroute."""
        edges = [
            {"target": "deep_dive", "condition": "Traditional lock only"},
            {"target": "deep_dive", "condition": "No formal access control"},
            {"target": "next_q", "condition": "any"},
        ]
        node = _node("access_control", edges, question_type="single_choice")
        node_map = {"access_control": node, "deep_dive": {}, "next_q": {}}

        # Positive answer — should go to next_q (skip deep_dive)
        result = run_db(
            determine_next_node_with_ai(node, "Biometric/smart lock", node_map, [], [], _settings)
        )
        assert result.ai_used is False
        assert result.target_id == "next_q"
        assert "MCQ" in result.reasoning

    def test_single_choice_negative_answer_routes_to_branch(self):
        """Negative MCQ answer must still correctly enter the deep-dive branch."""
        edges = [
            {"target": "deep_dive", "condition": "Traditional lock only"},
            {"target": "deep_dive", "condition": "No formal access control"},
            {"target": "next_q", "condition": "any"},
        ]
        node = _node("access_control", edges, question_type="single_choice")
        node_map = {"access_control": node, "deep_dive": {}, "next_q": {}}

        result = run_db(
            determine_next_node_with_ai(node, "Traditional lock only", node_map, [], [], _settings)
        )
        assert result.ai_used is False
        assert result.target_id == "deep_dive"

    def test_multi_choice_skips_ai(self):
        edges = [
            {"target": "branch_yes", "condition": "Yes"},
            {"target": "branch_no", "condition": "No"},
            {"target": "branch_fallback", "condition": "any"},
        ]
        node = _node("q1", edges, question_type="multi_choice")
        node_map = {"q1": node, "branch_yes": {}, "branch_no": {}, "branch_fallback": {}}

        result = run_db(
            determine_next_node_with_ai(node, ["Yes", "Maybe"], node_map, [], [], _settings)
        )
        assert result.ai_used is False

    def test_single_choice_travel_node_deterministic(self):
        """Simulates hni_travel_module_entry: 2 conditions to key_holder,
        1 condition to visitor_delivery.  All are MCQ — must be deterministic."""
        edges = [
            {"target": "key_holder", "condition": "Yes — frequently"},
            {"target": "key_holder", "condition": "Yes — occasionally"},
            {"target": "visitor_delivery", "condition": "Rarely/Never"},
        ]
        node = _node("travel_entry", edges, question_type="single_choice")
        node_map = {"travel_entry": node, "key_holder": {}, "visitor_delivery": {}}

        result_travel = run_db(
            determine_next_node_with_ai(node, "Yes — frequently", node_map, [], [], _settings)
        )
        assert result_travel.ai_used is False
        assert result_travel.target_id == "key_holder"

        result_no_travel = run_db(
            determine_next_node_with_ai(node, "Rarely/Never", node_map, [], [], _settings)
        )
        assert result_no_travel.ai_used is False
        assert result_no_travel.target_id == "visitor_delivery"


class TestTextInputBranching:
    """text_input nodes with 2+ distinct targets should still invoke Gemini."""

    @patch("branching.genai.Client")
    def test_text_input_with_distinct_targets_uses_ai(self, mock_cls):
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = _mock_gemini_response(
            "hni_travel_domestic", "User travels frequently within India"
        )
        mock_cls.return_value = mock_client

        edges = [
            {"target": "hni_travel_domestic", "condition": "domestic"},
            {"target": "hni_travel_international", "condition": "international"},
            {"target": "hni_no_travel", "condition": "any"},
        ]
        node = _node("hni_travel_free", edges, domain="CPP-06", question_type="text_input")
        node_map = {
            "hni_travel_free": node,
            "hni_travel_domestic": {},
            "hni_travel_international": {},
            "hni_no_travel": {},
        }

        result = run_db(
            determine_next_node_with_ai(
                node, "I mostly travel within India", node_map, [], [], _settings
            )
        )
        assert result.target_id == "hni_travel_domestic"
        assert result.ai_used is True

    def test_text_input_same_target_skips_ai(self):
        """text_input where all non-any edges share one target — still deterministic."""
        edges = [
            {"target": "deep_dive", "condition": "no"},
            {"target": "deep_dive", "condition": "none"},
            {"target": "next_q", "condition": "any"},
        ]
        node = _node("q_text", edges, question_type="text_input")
        node_map = {"q_text": node, "deep_dive": {}, "next_q": {}}

        result = run_db(determine_next_node_with_ai(node, "no", node_map, [], [], _settings))
        assert result.ai_used is False
        assert result.target_id == "deep_dive"
