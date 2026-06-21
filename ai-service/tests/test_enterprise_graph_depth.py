"""
Test Enterprise graph depth and branching requirements.
Verifies the v2 graph meets the sprint target:
  - 30+ total question nodes
  - 5+ branch nodes (conditional edges)
  - All CPP domains have ≥ 3 questions
"""

from collections import Counter
from pathlib import Path

import pytest
import yaml

_ROOT = Path(__file__).resolve().parent.parent.parent
_ENT_GRAPH = _ROOT / "question-graph" / "enterprise.yaml"


@pytest.fixture
def ent_data():
    with open(_ENT_GRAPH) as f:
        return yaml.safe_load(f)


@pytest.fixture
def ent_nodes(ent_data):
    return ent_data["nodes"]


@pytest.fixture
def non_terminal_nodes(ent_nodes):
    return [n for n in ent_nodes if not n.get("is_terminal")]


class TestEnterpriseGraphDepth:
    def test_total_nodes_at_least_30(self, non_terminal_nodes):
        assert len(non_terminal_nodes) >= 30, (
            f"Enterprise should have ≥30 question nodes, got {len(non_terminal_nodes)}"
        )

    def test_at_least_5_branch_nodes(self, ent_nodes):
        branch_nodes = []
        for n in ent_nodes:
            edges = n.get("edges", [])
            non_any = [e for e in edges if e.get("condition") != "any"]
            if len(non_any) >= 1:
                branch_nodes.append(n["id"])
        assert len(branch_nodes) >= 5, (
            f"Enterprise should have ≥5 branch nodes, got {len(branch_nodes)}: {branch_nodes}"
        )

    def test_all_domains_have_at_least_3_questions(self, non_terminal_nodes):
        domains = Counter(n["domain"] for n in non_terminal_nodes)
        for domain, count in sorted(domains.items()):
            assert count >= 3, f"Domain {domain} has only {count} questions, need ≥3"

    def test_cpp02_has_at_least_3_questions(self, non_terminal_nodes):
        cpp02_count = sum(1 for n in non_terminal_nodes if n["domain"] == "CPP-02")
        assert cpp02_count >= 3, f"CPP-02 should have ≥3 questions (was 1), got {cpp02_count}"

    def test_cpp04_has_at_least_3_questions(self, non_terminal_nodes):
        cpp04_count = sum(1 for n in non_terminal_nodes if n["domain"] == "CPP-04")
        assert cpp04_count >= 3, f"CPP-04 should have ≥3 questions (was 1), got {cpp04_count}"

    def test_version_is_3(self, ent_data):
        assert ent_data["metadata"]["version"] == 3

    def test_all_nodes_have_required_fields(self, ent_nodes):
        for node in ent_nodes:
            assert "id" in node, f"Node missing 'id': {node}"
            assert "domain" in node, f"Node {node['id']} missing 'domain'"
            assert "text" in node, f"Node {node['id']} missing 'text'"
            assert "edges" in node, f"Node {node['id']} missing 'edges'"

    def test_all_edge_targets_exist(self, ent_nodes):
        node_ids = {n["id"] for n in ent_nodes}
        for node in ent_nodes:
            for edge in node.get("edges", []):
                target = edge.get("target")
                if target:
                    assert target in node_ids, (
                        f"Node {node['id']} has edge to non-existent target '{target}'"
                    )

    def test_no_orphan_nodes(self, ent_nodes, ent_data):
        entry_id = ent_data["metadata"]["entry_node"]
        targets = set()
        for node in ent_nodes:
            for edge in node.get("edges", []):
                targets.add(edge.get("target"))
        node_ids = {n["id"] for n in ent_nodes}
        unreachable = node_ids - targets - {entry_id}
        assert not unreachable, f"Orphan nodes (unreachable): {sorted(unreachable)}"

    def test_facility_type_branching_exists(self, ent_nodes):
        """ent_q1_facility_type must have at least 2 non-any condition edges."""
        for n in ent_nodes:
            if n["id"] == "ent_q1_facility_type":
                edges = n.get("edges", [])
                non_any = [e for e in edges if e.get("condition") != "any"]
                assert len(non_any) >= 2, (
                    f"Facility type node should branch on ≥2 conditions, got {len(non_any)}"
                )
                return
        pytest.fail("ent_q1_facility_type not found")
