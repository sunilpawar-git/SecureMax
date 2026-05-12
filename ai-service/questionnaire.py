"""
Questionnaire engine — graph traversal with optional AI branching.
Drives question flow based on YAML graph + Gemini Flash for conditional decisions.
"""

from pathlib import Path
from typing import Any

import yaml

from config import TRACK_HNI
from models import QuestionNode

GRAPH_DIR = Path(__file__).resolve().parent.parent / "question-graph"

_graph_cache: dict[str, dict[str, Any]] = {}


def load_graph_for_track(track: str) -> dict[str, Any]:
    """Load and cache graph for a given track."""
    if track in _graph_cache:
        return _graph_cache[track]

    filename = "hni.yaml" if track == TRACK_HNI else "enterprise.yaml"
    filepath = GRAPH_DIR / filename
    with open(filepath) as f:
        graph = yaml.safe_load(f)

    _graph_cache[track] = graph
    return graph


def get_node_map(track: str) -> dict[str, dict]:
    """Return a dict mapping node IDs to their data."""
    graph = load_graph_for_track(track)
    return {n["id"]: n for n in graph["nodes"]}


def get_entry_node_id(track: str) -> str:
    graph = load_graph_for_track(track)
    return graph["metadata"]["entry_node"]


def node_to_response(node_data: dict) -> QuestionNode:
    """Convert raw YAML node dict to API response model."""
    return QuestionNode(
        id=node_data["id"],
        domain=node_data["domain"],
        text=node_data["text"],
        question_type=node_data["question_type"],
        options=node_data.get("options"),
        score_drop_trigger=node_data.get("score_drop_trigger", False),
    )


def determine_next_node(
    current_node: dict,
    answer: str | list[str],
    node_map: dict[str, dict],
) -> str | None:
    """Determine next node based on answer and edge conditions (deterministic)."""
    edges = current_node.get("edges", [])
    if not edges:
        return None

    answer_str = answer if isinstance(answer, str) else answer[0] if answer else ""
    answer_lower = answer_str.lower().strip()

    for edge in edges:
        condition = edge.get("condition", "")
        if condition == "any":
            continue
        if answer_lower == condition.lower().strip():
            return edge["target"]

    for edge in edges:
        if edge.get("condition", "") == "any":
            return edge["target"]

    return None


def reset_graph_cache() -> None:
    """Clear cached graphs. Call during testing or when YAML files change."""
    _graph_cache.clear()


def build_context_summary(events: list[dict], max_events: int = 5) -> str:
    """Build a concise context summary from recent session events for AI branching."""
    recent = events[-max_events:] if len(events) > max_events else events
    lines: list[str] = []
    for event in recent:
        q = event.get("question_text", "")[:80]
        a = event.get("answer", "")
        lines.append(f"Q: {q}\nA: {a}")
    return "\n---\n".join(lines)
