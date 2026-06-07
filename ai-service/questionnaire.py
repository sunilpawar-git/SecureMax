"""
Questionnaire engine — graph traversal with optional AI branching.
Drives question flow based on YAML graph + Gemini Flash for conditional decisions.

Cache behaviour: graphs are loaded once per process and cached in memory.
If the YAML files are updated (e.g., after reseeding), a server restart is required
to pick up the changes. The loader logs a WARNING when the on-disk version differs
from the cached version so ops can detect stale caches without examining logs manually.
"""

import logging
from pathlib import Path
from typing import Any

import yaml

from config import TRACK_HNI
from models import QuestionNode

logger = logging.getLogger(__name__)

GRAPH_DIR = Path(__file__).resolve().parent.parent / "question-graph"

_graph_cache: dict[str, dict[str, Any]] = {}


def _read_yaml_version(filepath: Path) -> str | None:
    """Read only the metadata.version from a graph YAML without caching."""
    try:
        with open(filepath) as f:
            data = yaml.safe_load(f)
        return str(data["metadata"]["version"]) if "version" in data.get("metadata", {}) else None
    except Exception:
        return None


def load_graph_for_track(track: str) -> dict[str, Any]:
    """Load and cache graph for a given track.

    On cache hit, checks whether the on-disk version matches the cached version
    and emits a WARNING if they differ — a restart is needed to pick up changes.
    """
    filename = "hni.yaml" if track == TRACK_HNI else "enterprise.yaml"
    filepath = GRAPH_DIR / filename

    if track in _graph_cache:
        cached_version = _graph_cache[track].get("metadata", {}).get("version")
        disk_version = _read_yaml_version(filepath)
        if disk_version is not None and str(cached_version) != str(disk_version):
            logger.warning(
                "Graph cache version mismatch for track '%s': cached=%s, on-disk=%s. "
                "A server restart is required to load the updated graph.",
                track,
                cached_version,
                disk_version,
            )
        return _graph_cache[track]

    try:
        with open(filepath) as f:
            graph = yaml.safe_load(f)
    except FileNotFoundError as exc:
        raise RuntimeError(f"Question graph not found: {filepath}") from exc
    except yaml.YAMLError as exc:
        raise RuntimeError(f"Invalid YAML in question graph: {filepath}") from exc

    _graph_cache[track] = graph
    return graph


def get_node_map(track: str) -> dict[str, dict]:
    """Return a dict mapping node IDs to their data."""
    graph = load_graph_for_track(track)
    return {n["id"]: n for n in graph["nodes"]}


def get_entry_node_id(track: str) -> str:
    graph = load_graph_for_track(track)
    return graph["metadata"]["entry_node"]


def get_graph_version(track: str) -> str | None:
    """Return the version string from the graph metadata, or None."""
    graph = load_graph_for_track(track)
    return str(graph["metadata"].get("version")) if "version" in graph.get("metadata", {}) else None


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


from context import build_context_summary as build_context_summary  # re-export for back-compat
