"""Tests for question graph validation and path coverage — Phase 3."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "question-graph"))
from validate import get_all_paths, load_graph, validate_graph  # noqa: E402

GRAPH_DIR = Path(__file__).resolve().parent.parent.parent / "question-graph"

MAX_QUESTIONS_PER_SESSION = 60
MIN_QUESTIONS_PER_SESSION = 20
REQUIRED_CPP_DOMAINS = {"CPP-01", "CPP-02", "CPP-03", "CPP-04", "CPP-05", "CPP-06", "CPP-07"}


class TestGraphValidation:
    """Structural integrity of each graph file."""

    def test_hni_graph_validates(self) -> None:
        graph = load_graph(GRAPH_DIR / "hni.yaml")
        errors = validate_graph(graph)
        assert errors == [], f"HNI graph errors: {errors}"

    def test_enterprise_graph_validates(self) -> None:
        graph = load_graph(GRAPH_DIR / "enterprise.yaml")
        errors = validate_graph(graph)
        assert errors == [], f"Enterprise graph errors: {errors}"


class TestGraphValidationEdgeCases:
    """Validation catches broken graphs."""

    def test_missing_entry_node(self) -> None:
        graph = {"metadata": {}, "nodes": []}
        errors = validate_graph(graph)
        assert any("entry_node" in e for e in errors)

    def test_entry_node_not_in_nodes(self) -> None:
        graph = {"metadata": {"entry_node": "nonexistent"}, "nodes": []}
        errors = validate_graph(graph)
        assert any("not found" in e for e in errors)

    def test_dead_end_detected(self) -> None:
        graph = {
            "metadata": {"entry_node": "a"},
            "nodes": [
                {
                    "id": "a",
                    "domain": "CPP-01",
                    "text": "Q",
                    "question_type": "single_choice",
                    "cpp_domain_tag": "CPP-01",
                    "edges": [{"target": "b", "condition": "any"}],
                },
                {
                    "id": "b",
                    "domain": "CPP-01",
                    "text": "Q",
                    "question_type": "single_choice",
                    "cpp_domain_tag": "CPP-01",
                    "edges": [],
                },
            ],
        }
        errors = validate_graph(graph)
        assert any("dead end" in e for e in errors)

    def test_missing_edge_target_detected(self) -> None:
        graph = {
            "metadata": {"entry_node": "a"},
            "nodes": [
                {
                    "id": "a",
                    "domain": "CPP-01",
                    "text": "Q",
                    "question_type": "single_choice",
                    "cpp_domain_tag": "CPP-01",
                    "edges": [{"target": "nonexistent", "condition": "any"}],
                },
            ],
        }
        errors = validate_graph(graph)
        assert any("not found" in e for e in errors)

    def test_invalid_domain_detected(self) -> None:
        graph = {
            "metadata": {"entry_node": "a"},
            "nodes": [
                {
                    "id": "a",
                    "domain": "CPP-99",
                    "text": "Q",
                    "question_type": "single_choice",
                    "cpp_domain_tag": "CPP-01",
                    "edges": [],
                    "is_terminal": True,
                },
            ],
        }
        errors = validate_graph(graph)
        assert any("invalid domain" in e for e in errors)


class TestHNIPathCoverage:
    """Path coverage tests for HNI graph."""

    def setup_method(self) -> None:
        self.graph = load_graph(GRAPH_DIR / "hni.yaml")
        self.nodes = self.graph["nodes"]
        self.entry = self.graph["metadata"]["entry_node"]
        self.paths = get_all_paths(self.nodes, self.entry)

    def test_at_least_one_path_to_terminal(self) -> None:
        assert len(self.paths) > 0

    def test_all_paths_reach_terminal(self) -> None:
        node_map = {n["id"]: n for n in self.nodes}
        for path in self.paths:
            terminal_node = node_map[path[-1]]
            assert terminal_node.get("is_terminal"), f"Path does not end at terminal: {path}"

    def test_path_length_within_limits(self) -> None:
        for path in self.paths:
            assert len(path) <= MAX_QUESTIONS_PER_SESSION, (
                f"Path too long ({len(path)} nodes): {path[:5]}..."
            )

    def test_all_seven_cpp_domains_covered(self) -> None:
        domains_in_graph = {n["domain"] for n in self.nodes if not n.get("is_terminal")}
        missing = REQUIRED_CPP_DOMAINS - domains_in_graph
        assert not missing, f"Missing CPP domains: {missing}"

    def test_score_drop_triggers_exist(self) -> None:
        triggers = [n for n in self.nodes if n.get("score_drop_trigger")]
        assert len(triggers) >= 4, f"Only {len(triggers)} score drop triggers"

    def test_entry_is_property_type_question(self) -> None:
        node_map = {n["id"]: n for n in self.nodes}
        entry_node = node_map[self.entry]
        assert "property" in entry_node["text"].lower()


class TestEnterprisePathCoverage:
    """Path coverage tests for enterprise graph."""

    def setup_method(self) -> None:
        self.graph = load_graph(GRAPH_DIR / "enterprise.yaml")
        self.nodes = self.graph["nodes"]
        self.entry = self.graph["metadata"]["entry_node"]
        self.paths = get_all_paths(self.nodes, self.entry)

    def test_at_least_one_path_to_terminal(self) -> None:
        assert len(self.paths) > 0

    def test_all_paths_reach_terminal(self) -> None:
        node_map = {n["id"]: n for n in self.nodes}
        for path in self.paths:
            terminal_node = node_map[path[-1]]
            assert terminal_node.get("is_terminal"), f"Path does not end at terminal: {path}"

    def test_path_length_within_limits(self) -> None:
        for path in self.paths:
            assert len(path) <= MAX_QUESTIONS_PER_SESSION

    def test_all_seven_cpp_domains_covered(self) -> None:
        domains_in_graph = {n["domain"] for n in self.nodes if not n.get("is_terminal")}
        missing = REQUIRED_CPP_DOMAINS - domains_in_graph
        assert not missing, f"Missing CPP domains: {missing}"

    def test_has_enterprise_specific_modules(self) -> None:
        module_tags = {n.get("module_tag") for n in self.nodes if n.get("module_tag")}
        expected_modules = {"loading_dock", "contractor_mgmt", "cctv_sop", "inventory_controls"}
        missing = expected_modules - module_tags
        assert not missing, f"Missing enterprise modules: {missing}"

    def test_score_drop_triggers_exist(self) -> None:
        triggers = [n for n in self.nodes if n.get("score_drop_trigger")]
        assert len(triggers) >= 4

    def test_entry_is_facility_type_question(self) -> None:
        node_map = {n["id"]: n for n in self.nodes}
        entry_node = node_map[self.entry]
        assert "facility" in entry_node["text"].lower()

    def test_compliance_audit_question_exists(self) -> None:
        compliance_qs = [
            n
            for n in self.nodes
            if "iso 27001" in n["text"].lower() or "psara" in n["text"].lower()
        ]
        assert len(compliance_qs) >= 1
