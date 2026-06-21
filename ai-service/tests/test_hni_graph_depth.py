"""
Test HNI graph depth and branching requirements.
Verifies the v2 graph meets the sprint target:
  - 40+ total question nodes
  - 6+ branch nodes (conditional edges)
  - All CPP domains have ≥ 3 questions
"""

from collections import Counter
from pathlib import Path

import pytest
import yaml

_ROOT = Path(__file__).resolve().parent.parent.parent
_HNI_GRAPH = _ROOT / "question-graph" / "hni.yaml"


@pytest.fixture
def hni_data():
    with open(_HNI_GRAPH) as f:
        return yaml.safe_load(f)


@pytest.fixture
def hni_nodes(hni_data):
    return hni_data["nodes"]


@pytest.fixture
def non_terminal_nodes(hni_nodes):
    return [n for n in hni_nodes if not n.get("is_terminal")]


class TestHniGraphDepth:
    def test_total_nodes_at_least_40(self, non_terminal_nodes):
        assert len(non_terminal_nodes) >= 40, (
            f"HNI should have ≥40 question nodes, got {len(non_terminal_nodes)}"
        )

    def test_at_least_6_branch_nodes(self, hni_nodes):
        branch_nodes = []
        for n in hni_nodes:
            edges = n.get("edges", [])
            non_any = [e for e in edges if e.get("condition") != "any"]
            if len(non_any) >= 1:
                branch_nodes.append(n["id"])
        assert len(branch_nodes) >= 6, (
            f"HNI should have ≥6 branch nodes, got {len(branch_nodes)}: {branch_nodes}"
        )

    def test_all_domains_have_at_least_3_questions(self, non_terminal_nodes):
        domains = Counter(n["domain"] for n in non_terminal_nodes)
        for domain, count in sorted(domains.items()):
            assert count >= 3, f"Domain {domain} has only {count} questions, need ≥3"

    def test_cpp02_has_at_least_4_questions(self, non_terminal_nodes):
        cpp02_count = sum(1 for n in non_terminal_nodes if n["domain"] == "CPP-02")
        assert cpp02_count >= 4, f"CPP-02 should have ≥4 questions (was 2), got {cpp02_count}"

    def test_version_is_3(self, hni_data):
        assert hni_data["metadata"]["version"] == 3

    def test_all_nodes_have_required_fields(self, hni_nodes):
        for node in hni_nodes:
            assert "id" in node, f"Node missing 'id': {node}"
            assert "domain" in node, f"Node {node['id']} missing 'domain'"
            assert "text" in node, f"Node {node['id']} missing 'text'"
            assert "edges" in node, f"Node {node['id']} missing 'edges'"

    def test_all_edge_targets_exist(self, hni_nodes):
        node_ids = {n["id"] for n in hni_nodes}
        for node in hni_nodes:
            for edge in node.get("edges", []):
                target = edge.get("target")
                if target:
                    assert target in node_ids, (
                        f"Node {node['id']} has edge to non-existent target '{target}'"
                    )

    def test_no_orphan_nodes(self, hni_nodes, hni_data):
        """Every non-entry node must be reachable from at least one other node."""
        entry_id = hni_data["metadata"]["entry_node"]
        targets = set()
        for node in hni_nodes:
            for edge in node.get("edges", []):
                targets.add(edge.get("target"))
        node_ids = {n["id"] for n in hni_nodes}
        unreachable = node_ids - targets - {entry_id}
        assert not unreachable, f"Orphan nodes (unreachable): {sorted(unreachable)}"
