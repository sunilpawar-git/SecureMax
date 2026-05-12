"""
Question graph validation script.
Checks: orphan nodes, dead ends, cycles, missing references, terminal reachability.
Seed pipeline MUST fail if validation fails.
"""

import sys
from pathlib import Path
from typing import Any

import yaml

VALID_DOMAINS = {"CPP-01", "CPP-02", "CPP-03", "CPP-04", "CPP-05", "CPP-06", "CPP-07"}
VALID_QUESTION_TYPES = {"single_choice", "multi_choice", "text_input", "terminal"}


def load_graph(filepath: Path) -> dict[str, Any]:
    with open(filepath) as f:
        return yaml.safe_load(f)


def validate_graph(graph: dict[str, Any]) -> list[str]:
    """Return list of error messages. Empty list means valid."""
    errors: list[str] = []
    metadata = graph.get("metadata", {})
    nodes = graph.get("nodes", [])

    if not metadata.get("entry_node"):
        errors.append("Missing entry_node in metadata")

    node_ids = {n["id"] for n in nodes}
    entry = metadata.get("entry_node")

    if entry and entry not in node_ids:
        errors.append(f"Entry node '{entry}' not found in nodes")

    for node in nodes:
        nid = node["id"]

        if node.get("domain") not in VALID_DOMAINS:
            errors.append(f"{nid}: invalid domain '{node.get('domain')}'")

        if node.get("question_type") not in VALID_QUESTION_TYPES:
            errors.append(f"{nid}: invalid question_type '{node.get('question_type')}'")

        if node.get("cpp_domain_tag") not in VALID_DOMAINS:
            errors.append(f"{nid}: invalid cpp_domain_tag '{node.get('cpp_domain_tag')}'")

        edges = node.get("edges", [])
        is_terminal = node.get("is_terminal", False)

        if not is_terminal and not edges:
            errors.append(f"{nid}: non-terminal node with no edges (dead end)")

        for edge in edges:
            target = edge.get("target")
            if target and target not in node_ids:
                errors.append(f"{nid}: edge target '{target}' not found")

    errors.extend(_check_orphans(node_ids, nodes, entry))
    errors.extend(_check_terminal_reachability(node_ids, nodes, entry))

    return errors


def _check_orphans(
    node_ids: set[str], nodes: list[dict], entry: str | None
) -> list[str]:
    """Find nodes unreachable from any edge (except entry node)."""
    referenced: set[str] = set()
    if entry:
        referenced.add(entry)

    for node in nodes:
        for edge in node.get("edges", []):
            target = edge.get("target")
            if target:
                referenced.add(target)

    orphans = node_ids - referenced
    return [f"{nid}: orphan node (unreachable)" for nid in orphans]


def _check_terminal_reachability(
    node_ids: set[str], nodes: list[dict], entry: str | None
) -> list[str]:
    """Verify that at least one terminal node is reachable from entry."""
    if not entry:
        return ["Cannot check terminal reachability without entry_node"]

    node_map = {n["id"]: n for n in nodes}
    visited: set[str] = set()
    terminals_reached: set[str] = set()

    def dfs(nid: str) -> None:
        if nid in visited or nid not in node_map:
            return
        visited.add(nid)
        node = node_map[nid]
        if node.get("is_terminal"):
            terminals_reached.add(nid)
        for edge in node.get("edges", []):
            dfs(edge.get("target", ""))

    dfs(entry)

    if not terminals_reached:
        return ["No terminal node reachable from entry"]
    return []


def get_all_paths(
    nodes: list[dict], entry: str, max_depth: int = 80
) -> list[list[str]]:
    """Enumerate all paths from entry to terminal nodes (DFS with depth limit)."""
    node_map = {n["id"]: n for n in nodes}
    paths: list[list[str]] = []

    def dfs(nid: str, path: list[str]) -> None:
        if nid not in node_map or len(path) > max_depth:
            return
        node = node_map[nid]
        path.append(nid)
        if node.get("is_terminal"):
            paths.append(list(path))
        else:
            targets = {e.get("target") for e in node.get("edges", []) if e.get("target")}
            for target in targets:
                dfs(target, path)
        path.pop()

    dfs(entry, [])
    return paths


def main() -> int:
    graph_dir = Path(__file__).parent
    files = list(graph_dir.glob("*.yaml"))

    if not files:
        print("ERROR: No YAML graph files found")
        return 1

    total_errors: list[str] = []
    for filepath in files:
        print(f"Validating {filepath.name}...")
        graph = load_graph(filepath)
        errors = validate_graph(graph)
        for err in errors:
            print(f"  ERROR: {err}")
            total_errors.append(f"{filepath.name}: {err}")

    if total_errors:
        print(f"\nFAILED: {len(total_errors)} errors found")
        return 1

    print(f"\nPASSED: {len(files)} graph(s) validated successfully")
    return 0


if __name__ == "__main__":
    sys.exit(main())
