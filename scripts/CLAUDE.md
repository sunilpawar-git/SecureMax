# CLAUDE.md — `scripts/` (Root-Level Shell Scripts)

Code quality and ops shell scripts: secrets scanning, file length enforcement, YAML validation, RLS verification.

## Rules

- **`pre-commit-check.sh` is the git pre-commit hook entry point** — runs secrets scan + file length check + YAML validation
- **`check-secrets.sh`** — run before every PR; fails on any `SECRET_KEY`, private key, or token pattern
- **`rls-verify.sql`** — run after every migration that touches auth or user tables; verifies RLS is active
- **`tech-debt-audit.sh`** — run before sprint review; surfaces TODO/FIXME/HACK counts
- **`validate-yaml.sh`** — run when question-graph YAMLs change; calls `question-graph/validate.py`
- **Never bypass `pre-commit-check.sh` with `--no-verify`** (Rule 14)

## Scripts

| Script | Purpose | Trigger |
|--------|---------|---------|
| `pre-commit-check.sh` | Runs on git pre-commit; calls secrets scan, file length check, YAML validation | Automatic (git hook) |
| `check-secrets.sh` | Scan for leaked secrets (API keys, tokens, private keys) | Before every PR; manual `bash scripts/check-secrets.sh` |
| `check-file-length.sh` | Enforce max file length policy (typically 300 lines) | Part of pre-commit |
| `validate-yaml.sh` | Validate YAML files in `question-graph/` | When YAMLs change; calls `question-graph/validate.py` |
| `tech-debt-audit.sh` | Count TODO/FIXME/HACK comments; surface debt before sprint review | Manual before sprint planning |
| `rls-verify.sql` | SQL script to verify Postgres RLS policies are active | After migrations touching auth/users |
| `verify-rls.sh` | Shell wrapper around `rls-verify.sql` | After migrations touching auth/users |

## Running Scripts

```bash
# Secrets scan (manual)
bash scripts/check-secrets.sh

# YAML validation (manual)
bash scripts/validate-yaml.sh

# Tech debt audit (manual)
bash scripts/tech-debt-audit.sh

# RLS verification (after auth migrations)
bash scripts/verify-rls.sh
```

## Pre-Commit Hook Setup

```bash
# Install git hook
ln -s scripts/pre-commit-check.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Verify it's active
git hook list

# To bypass (dangerous; never do without good reason)
git commit --no-verify  # NOT RECOMMENDED; violates Rule 14
```

## File Length Enforcement

`check-file-length.sh` limits:
- TypeScript/JavaScript: 300 lines
- Python: 300 lines
- YAML: 500 lines (configs may be longer)

## Common Pitfalls

1. Bypassing pre-commit with `--no-verify` → secrets leak, style violations slip through
2. Ignoring `check-secrets.sh` output → credentials end up in public repo
3. Committing files that exceed max length → harder to review, test, maintain
4. Running migrations without `verify-rls.sh` → RLS policies might be inactive
5. Leaving TODOs untracked → debt accumulates silently until sprint review
6. Editing YAML without running `validate-yaml.sh` → invalid nodes reach seeding
