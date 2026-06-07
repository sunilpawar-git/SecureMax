# CLAUDE.md — `ai-service/scripts/`

One-time seeding and setup scripts: CPP embeddings, question graph, sample threat intel.

## Rules

- **Preferred CPP embeddings seed**: `seed_cpp_embeddings_md_sync.py` (sync, supports `--dry-run`, preferred over async variants)
- **Always run `python question-graph/validate.py`** before `seed_question_graph.py`
- **Use `db_admin` role connection string** for all seeds (full access required)
- **All scripts are idempotent** — safe to rerun; they upsert, not blindly insert
- **`seed_sample_threat_intel.py` is dev/test only** — never run against production DB
- **`--dry-run` flag available** on embedding scripts — use it to verify chunk count before committing

## Scripts

| Script                           | Purpose                                                                   | Usage                                               |
| -------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| `seed_cpp_embeddings_md_sync.py` | CPP PDFs (Markdown) → chunk → Gemini embed → insert (sync, **preferred**) | `python seed_cpp_embeddings_md_sync.py [--dry-run]` |
| `seed_question_graph.py`         | YAML graphs → validate → upsert `question_nodes`                          | `python seed_question_graph.py`                     |
| `seed_sample_threat_intel.py`    | Insert hardcoded sample threat articles (idempotent)                      | `python seed_sample_threat_intel.py`                |

## Initial Setup Workflow

```bash
cd ai-service

# 1. Seed CPP embeddings (dry-run first)
python scripts/seed_cpp_embeddings_md_sync.py --dry-run
python scripts/seed_cpp_embeddings_md_sync.py

# 2. Validate question graph before seeding
python ../question-graph/validate.py

# 3. Seed question graph
python scripts/seed_question_graph.py

# 4. (Optional) Seed sample threat intel for dev/test
python scripts/seed_sample_threat_intel.py
```

## Flags

| Script                           | Flag        | Purpose                                        |
| -------------------------------- | ----------- | ---------------------------------------------- |
| `seed_cpp_embeddings_md_sync.py` | `--dry-run` | Count chunks without inserting; preview impact |

## Environment Requirements

```bash
export DATABASE_URL="postgresql://db_admin:pass@localhost/raivan"
export GENAI_API_KEY="<key_goes_here>"

python scripts/seed_cpp_embeddings_md_sync.py
```

## Common Pitfalls

1. Using async embeddings script when sync is available → slower, harder to debug
2. Skipping `validate.py` before seeding question graph → invalid nodes in DB
3. Running `seed_sample_threat_intel.py` in production → junk articles pollute threat intelligence
4. Not using `--dry-run` before committing → unexpected chunk counts
5. Using wrong DB role (not `db_admin`) → permission denied on insert
6. Not checking embedding dimension mismatch → pgvector schema violation
