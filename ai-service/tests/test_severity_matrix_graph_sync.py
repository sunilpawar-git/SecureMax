"""
Test that severity_matrix.yaml is in sync with the question graph YAMLs.
Every non-terminal node in both HNI and Enterprise graphs MUST have an entry.
"""

from pathlib import Path

import yaml

_ROOT = Path(__file__).resolve().parent.parent.parent
_HNI_GRAPH = _ROOT / "question-graph" / "hni.yaml"
_ENT_GRAPH = _ROOT / "question-graph" / "enterprise.yaml"
_MATRIX = Path(__file__).resolve().parent.parent / "config" / "severity_matrix.yaml"


def _load_graph_node_ids(path: Path) -> list[dict]:
    with open(path) as f:
        data = yaml.safe_load(f)
    return data.get("nodes", [])


def _load_matrix_node_ids() -> set[str]:
    with open(_MATRIX) as f:
        matrix = yaml.safe_load(f)
    ids: set[str] = set()
    for domain_entries in matrix.values():
        if isinstance(domain_entries, dict):
            ids.update(domain_entries.keys())
    return ids


def _non_terminal_ids(nodes: list[dict]) -> set[str]:
    return {n["id"] for n in nodes if not n.get("is_terminal")}


class TestMatrixGraphSync:
    def test_matrix_loads_without_error(self):
        ids = _load_matrix_node_ids()
        assert len(ids) > 0

    def test_all_hni_nodes_in_matrix(self):
        nodes = _load_graph_node_ids(_HNI_GRAPH)
        node_ids = _non_terminal_ids(nodes)
        matrix_ids = _load_matrix_node_ids()
        missing = node_ids - matrix_ids
        assert not missing, f"HNI nodes missing from severity matrix: {sorted(missing)}"

    def test_all_enterprise_nodes_in_matrix(self):
        nodes = _load_graph_node_ids(_ENT_GRAPH)
        node_ids = _non_terminal_ids(nodes)
        matrix_ids = _load_matrix_node_ids()
        missing = node_ids - matrix_ids
        assert not missing, f"Enterprise nodes missing from severity matrix: {sorted(missing)}"

    def test_no_stale_matrix_entries(self):
        """Every matrix entry must correspond to a real graph node."""
        hni_nodes = _non_terminal_ids(_load_graph_node_ids(_HNI_GRAPH))
        ent_nodes = _non_terminal_ids(_load_graph_node_ids(_ENT_GRAPH))
        all_graph_ids = hni_nodes | ent_nodes
        matrix_ids = _load_matrix_node_ids()
        stale = matrix_ids - all_graph_ids
        assert not stale, f"Stale matrix entries (not in any graph): {sorted(stale)}"

    def test_every_entry_has_required_fields(self):
        with open(_MATRIX) as f:
            matrix = yaml.safe_load(f)
        for domain, entries in matrix.items():
            if not isinstance(entries, dict):
                continue
            for node_id, config in entries.items():
                assert "negative_patterns" in config, (
                    f"{domain}.{node_id} missing negative_patterns"
                )
                assert "severity_override" in config, (
                    f"{domain}.{node_id} missing severity_override"
                )
                assert "risk_impact" in config, f"{domain}.{node_id} missing risk_impact"
                assert config["severity_override"] in ("critical", "high", "medium", "low"), (
                    f"{domain}.{node_id} invalid severity: {config['severity_override']}"
                )
