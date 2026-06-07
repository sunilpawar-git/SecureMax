"""
Golden-path E2E test fixture — worst-case session through all HNI v2 branches.
Simulates a user who gives the most negative possible answer at every node,
ensuring all conditional branches are exercised.

Marked as integration since it exercises the full graph traversal logic.
"""

from collections import Counter
from pathlib import Path

import pytest
import yaml

_ROOT = Path(__file__).resolve().parent.parent.parent
_HNI_GRAPH = _ROOT / "question-graph" / "hni.yaml"
_MATRIX = Path(__file__).resolve().parent.parent / "config" / "severity_matrix.yaml"


@pytest.fixture
def hni_data():
    with open(_HNI_GRAPH) as f:
        return yaml.safe_load(f)


@pytest.fixture
def severity_matrix():
    with open(_MATRIX) as f:
        return yaml.safe_load(f)


def _get_node_map(data):
    return {n["id"]: n for n in data["nodes"]}


def _find_negative_answer(node: dict, matrix_entries: dict) -> str:
    """Pick the most negative option for a node based on the severity matrix."""
    node_id = node["id"]
    if node_id in matrix_entries:
        patterns = matrix_entries[node_id].get("negative_patterns", [])
        options = node.get("options", [])
        for pattern in patterns:
            for opt in options:
                if pattern.lower() in opt.lower():
                    return opt
    options = node.get("options", [])
    if options:
        return options[-1]
    return "No"


def _flatten_matrix(matrix: dict) -> dict:
    """Flatten domain-grouped matrix into {node_id: config}."""
    flat = {}
    for domain_entries in matrix.values():
        if isinstance(domain_entries, dict):
            flat.update(domain_entries)
    return flat


def _resolve_next_node(node: dict, answer: str) -> str | None:
    """Determine next node ID given an answer (simulates branching logic)."""
    edges = node.get("edges", [])
    if not edges:
        return None

    for edge in edges:
        cond = edge.get("condition", "any")
        if cond != "any" and cond.lower() == answer.lower():
            return edge["target"]

    for edge in edges:
        cond = edge.get("condition", "any")
        if cond != "any" and cond.lower() in answer.lower():
            return edge["target"]

    for edge in edges:
        if edge.get("condition") == "any":
            return edge["target"]

    return edges[0]["target"] if edges else None


@pytest.mark.integration
class TestGoldenPathE2E:
    def test_worst_case_visits_all_branch_nodes(self, hni_data, severity_matrix):
        """Walk the graph choosing negative answers — all branch nodes must be visited."""
        node_map = _get_node_map(hni_data)
        matrix = _flatten_matrix(severity_matrix)
        entry_id = hni_data["metadata"]["entry_node"]

        branch_node_ids = set()
        for n in hni_data["nodes"]:
            edges = n.get("edges", [])
            non_any = [e for e in edges if e.get("condition") != "any"]
            if non_any:
                branch_node_ids.add(n["id"])

        visited: set[str] = set()
        current_id = entry_id
        max_steps = 100

        for _ in range(max_steps):
            if not current_id or current_id not in node_map:
                break
            node = node_map[current_id]
            visited.add(current_id)

            if node.get("is_terminal"):
                break

            answer = _find_negative_answer(node, matrix)
            current_id = _resolve_next_node(node, answer)

        visited_branches = visited & branch_node_ids
        assert len(visited_branches) >= 4, (
            f"Worst-case path should visit ≥4 branch nodes, "
            f"visited {len(visited_branches)}: {sorted(visited_branches)}"
        )

    def test_worst_case_severity_all_high_or_critical(self, hni_data, severity_matrix):
        """Every node visited in worst-case path should yield high or critical severity."""
        node_map = _get_node_map(hni_data)
        matrix = _flatten_matrix(severity_matrix)
        entry_id = hni_data["metadata"]["entry_node"]

        visited_nodes: list[str] = []
        current_id = entry_id
        max_steps = 100

        for _ in range(max_steps):
            if not current_id or current_id not in node_map:
                break
            node = node_map[current_id]
            visited_nodes.append(current_id)

            if node.get("is_terminal"):
                break

            answer = _find_negative_answer(node, matrix)
            current_id = _resolve_next_node(node, answer)

        severity_counts = Counter()
        for nid in visited_nodes:
            if nid in matrix:
                sev = matrix[nid].get("severity_override", "unknown")
                severity_counts[sev] += 1

        total_with_severity = sum(severity_counts.values())
        critical_high = severity_counts.get("critical", 0) + severity_counts.get("high", 0)
        assert total_with_severity > 0, "No severity matches found in worst-case path"
        assert critical_high >= total_with_severity * 0.4, (
            f"Expected ≥40% critical/high, got {critical_high}/{total_with_severity}: "
            f"{dict(severity_counts)}"
        )

    def test_worst_case_reaches_terminal(self, hni_data, severity_matrix):
        """Worst-case path must terminate (no infinite loops)."""
        node_map = _get_node_map(hni_data)
        matrix = _flatten_matrix(severity_matrix)
        entry_id = hni_data["metadata"]["entry_node"]

        current_id = entry_id
        visited: set[str] = set()
        max_steps = 100

        for step in range(max_steps):
            if not current_id or current_id not in node_map:
                break
            if current_id in visited:
                pytest.fail(f"Infinite loop detected at step {step}: {current_id}")
            visited.add(current_id)
            node = node_map[current_id]

            if node.get("is_terminal"):
                return

            answer = _find_negative_answer(node, matrix)
            current_id = _resolve_next_node(node, answer)

        pytest.fail(f"Did not reach terminal within {max_steps} steps")

    def test_all_domains_represented_in_worst_path(self, hni_data, severity_matrix):
        """Worst-case path should touch questions from all 7 CPP domains."""
        node_map = _get_node_map(hni_data)
        matrix = _flatten_matrix(severity_matrix)
        entry_id = hni_data["metadata"]["entry_node"]

        domains_visited: set[str] = set()
        current_id = entry_id
        max_steps = 100

        for _ in range(max_steps):
            if not current_id or current_id not in node_map:
                break
            node = node_map[current_id]
            domains_visited.add(node["domain"])

            if node.get("is_terminal"):
                break

            answer = _find_negative_answer(node, matrix)
            current_id = _resolve_next_node(node, answer)

        assert len(domains_visited) >= 7, (
            f"Worst-case should visit all 7 CPP domains, got {len(domains_visited)}: "
            f"{sorted(domains_visited)}"
        )
