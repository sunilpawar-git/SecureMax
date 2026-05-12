"""
Seeds question_nodes table from YAML graph files.
Idempotent: upserts based on node ID + version.
Runs validation before seeding — fails loud if graph is invalid.
"""

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "question-graph"))
from validate import load_graph, validate_graph  # noqa: E402

GRAPH_DIR = Path(__file__).resolve().parent.parent.parent / "question-graph"


def load_and_validate_all() -> list[dict]:
    """Load all YAML graphs, validate, return flat list of nodes with track metadata."""
    all_nodes: list[dict] = []

    for filepath in sorted(GRAPH_DIR.glob("*.yaml")):
        graph = load_graph(filepath)
        errors = validate_graph(graph)
        if errors:
            print(f"VALIDATION FAILED for {filepath.name}:")
            for err in errors:
                print(f"  ERROR: {err}")
            raise SystemExit(1)

        track = graph["metadata"]["track"]
        version = graph["metadata"]["version"]

        for node in graph["nodes"]:
            all_nodes.append(
                {
                    "id": node["id"],
                    "domain": node["domain"],
                    "text": node["text"],
                    "question_type": node["question_type"],
                    "edges": json.dumps(node.get("edges", [])),
                    "cpp_domain_tag": node["cpp_domain_tag"],
                    "track": track,
                    "module_tag": node.get("module_tag"),
                    "version": version,
                    "is_terminal": node.get("is_terminal", False),
                }
            )

    return all_nodes


async def seed_to_db(nodes: list[dict]) -> None:
    """Insert nodes into database. Requires DATABASE_URL env var."""
    try:
        import asyncpg
    except ImportError:
        print("asyncpg not installed — skipping DB seed (dry run only)")
        return

    import os

    url = os.environ.get("DATABASE_URL", "")
    if not url:
        print("DATABASE_URL not set — skipping DB seed")
        return

    conn = await asyncpg.connect(url.replace("+asyncpg", ""))
    try:
        for node in nodes:
            await conn.execute(
                """
                INSERT INTO question_nodes
                    (id, domain, text, question_type, edges, cpp_domain_tag,
                     track, module_tag, version, is_terminal, created_at)
                VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    domain = EXCLUDED.domain,
                    text = EXCLUDED.text,
                    question_type = EXCLUDED.question_type,
                    edges = EXCLUDED.edges,
                    cpp_domain_tag = EXCLUDED.cpp_domain_tag,
                    track = EXCLUDED.track,
                    module_tag = EXCLUDED.module_tag,
                    version = EXCLUDED.version,
                    is_terminal = EXCLUDED.is_terminal
                """,
                node["id"],
                node["domain"],
                node["text"],
                node["question_type"],
                node["edges"],
                node["cpp_domain_tag"],
                node["track"],
                node["module_tag"],
                node["version"],
                node["is_terminal"],
            )
        print(f"Seeded {len(nodes)} question nodes to DB")
    finally:
        await conn.close()


def main() -> None:
    nodes = load_and_validate_all()
    print(f"Loaded and validated {len(nodes)} question nodes")

    for node in nodes[:3]:
        print(f"  {node['id']} [{node['track']}] {node['domain']}: {node['text'][:60]}...")

    if "--dry-run" not in sys.argv:
        asyncio.run(seed_to_db(nodes))
    else:
        print("Dry run — skipping DB seed")


if __name__ == "__main__":
    main()
