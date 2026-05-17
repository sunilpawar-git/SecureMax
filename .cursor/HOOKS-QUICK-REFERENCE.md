# Cursor Hooks - Quick Reference Guide

## What Are Hooks?

Hooks are deterministic automations that run at specific lifecycle points in Cursor. Unlike CLAUDE.md rules (which rely on developer discipline), hooks **always run** — no exceptions.

## Project-Level Hooks (Already Active ✅)

All of these are checked into `.cursor/hooks.json` and will run automatically:

### 1. Auto-Format Hook
- **Trigger**: After editing any `.ts`, `.tsx`, `.css`, or `.py` file
- **Action**: Auto-formats using Prettier (JS/CSS) or ruff format (Python)
- **Benefit**: Zero formatting drift; eliminates style debates

### 2. YAML Validation Hook
- **Trigger**: After editing `question-graph/*.yaml`
- **Action**: Validates schema using `question-graph/validate.py`
- **Benefit**: Prevents broken graph from being seeded into database

### 3. Dangerous Command Blocker
- **Trigger**: Before executing any shell command
- **Blocks**:
  - `rm -rf` (outside `.cursor/`)
  - `git push --force`
  - `UPDATE`/`DELETE` SQL without WHERE
  - `DROP DATABASE` / `DROP TABLE`
  - Prisma migrations with `NODE_ENV=production`
- **Benefit**: Prevents accidental data loss

### 4. Secret Detection Hook
- **Trigger**: Before submitting a prompt to Claude
- **Detects**:
  - API keys (Razorpay, Google, Firebase, AWS, Stripe)
  - Bearer tokens and JWTs
  - Database connection strings with passwords
  - Emails paired with credentials
  - Private cryptographic keys
- **Benefit**: Prevents accidental secret leakage

---

## User-Level Hooks (Optional, Install Per-Developer)

### 1. Tech Debt Sweep Hook
- **Trigger**: End of session (when Claude finishes)
- **Scans**:
  - Linting violations (ESLint + ruff)
  - Dead code (unused imports)
  - Test gaps (coverage < 70%)
  - Security issues (npm audit + Bandit)
  - TODO/FIXME comments
- **Output**: `DEBT-SWEEP-<timestamp>.md` with severity ranking
- **Benefit**: Automated sprint-end code health audit

### 2. Cache Inspector Hook (Optional)
- **Trigger**: End of session
- **Checks**: `node_modules/`, `.next/`, `__pycache__/` sizes
- **Warns**: If exceeds thresholds (e.g., node_modules > 500MB)
- **Benefit**: Keeps local dev environment lean

---

## Setup Instructions

### Project-Level (Already Done ✅)

The following files are in git and automatically active:

```
.cursor/
├── hooks.json                        (config)
└── hooks/
    ├── format-edited-files.sh        (auto-format)
    ├── validate-question-graph.sh    (YAML validation)
    ├── block-dangerous-commands.sh   (safety gate)
    └── detect-secrets-in-prompt.sh   (secret detection)
```

### User-Level (Optional Installation)

To enable tech debt sweep on your machine:

```bash
# 1. Create hooks directory
mkdir -p ~/.cursor/hooks

# 2. Copy scripts from project
cp .cursor/user-hooks/tech-debt-sweep.sh ~/.cursor/hooks/
chmod +x ~/.cursor/hooks/tech-debt-sweep.sh

# 3. Create ~/.cursor/hooks.json
cat > ~/.cursor/hooks.json << 'EOF'
{
  "version": 1,
  "hooks": {
    "stop": [
      {
        "command": "./hooks/tech-debt-sweep.sh",
        "timeout": 120
      }
    ]
  }
}
EOF

# 4. Restart Cursor
```

---

## Hook Lifecycle & Behavior

| Hook | Event | Fail Behavior | User Impact |
|------|-------|---------------|-------------|
| Auto-Format | afterFileEdit | Fail open | File formats on next edit if it fails |
| YAML Validation | afterFileEdit | Fail open | Warning logged; you continue |
| Dangerous Blocker | beforeShellExecution | Fail **closed** | Command blocked if hook fails |
| Secret Detection | beforeSubmitPrompt | Fail open | Warning shown; you can proceed |
| Tech Debt Sweep | stop | Fail open | Report generated even if some scans fail |

---

## Real-World Examples

### Example 1: Auto-Formatting
You edit `src/auth.ts` with inconsistent indentation. The hook runs `npx prettier --write` automatically. When you save, the file is formatted per `.prettierrc` rules.

### Example 2: YAML Validation
You edit `question-graph/hni.yaml` and break a condition syntax. The hook runs validation and shows:
```
❌ YAML schema validation failed: question-graph/hni.yaml

Error: Invalid condition syntax on line 42
Please review the YAML structure.
```

### Example 3: Dangerous Command Blocker
You accidentally type `rm -rf src/`. Before execution, the hook intercepts:
```
⚠️ RISKY: This command uses 'rm -rf' which is destructive. Please review before proceeding.
```
You must confirm or abort.

### Example 4: Secret Detection
You're about to send a prompt:
```
Here's my Razorpay key: RAZORPAY_KEY=pk_live_abc123xyz. Can you debug this?
```
The hook warns:
```
🔒 SECURITY WARNING: Possible API key or environment variable assignment
Do NOT submit if you want to keep these secrets private.
```

### Example 5: Tech Debt Sweep
End of sprint, hook runs and generates `DEBT-SWEEP-20260517_173245.md`:
```
## Summary
| Category | Count | Severity |
| Linting Violations | 3 | High |
| Dead Code Issues | 0 | None |
| Test Gaps | 1 | High |
| Security Issues | 0 | None |
| TODO/FIXME | 5 | Medium |

## Critical Issues
### Linting Violations (3)
- Unused variable in src/auth.ts:42
- Missing import in src/api.ts:18
...

## Remediation Plan
### This Sprint 🎯
1. Fix all linting violations (0 → 3)
2. Increase test coverage by 10%
```

---

## Troubleshooting

**Q: Hook didn't run?**
- Restart Cursor after modifying `~/.cursor/hooks.json`
- Check hook syntax: `jq . ~/.cursor/hooks.json`
- Verify script is executable: `ls -la ~/.cursor/hooks/tech-debt-sweep.sh`

**Q: Hook is too slow?**
- Increase timeout in hooks.json (value is in seconds)
- Tech debt sweep can take 30-120s depending on project size

**Q: Hook blocked something I need to do?**
- Dangerous command blocker: Confirm it's safe, and the hook will let it through
- Secret detection: Review the flagged content, remove sensitive data, and retry

**Q: How do I disable a hook?**
- Remove the hook entry from `.cursor/hooks.json` and restart Cursor

**Q: Can I modify hook behavior?**
- Yes! Edit the shell scripts in `.cursor/hooks/` (project-level) or `~/.cursor/hooks/` (user-level)

---

## File Structure Overview

```
Security Crawler/
├── .cursor/
│   ├── hooks.json                    ← Project-level config
│   ├── HOOKS-SETUP.md               ← Detailed setup guide
│   ├── hooks/
│   │   ├── format-edited-files.sh
│   │   ├── validate-question-graph.sh
│   │   ├── block-dangerous-commands.sh
│   │   └── detect-secrets-in-prompt.sh
│   └── user-hooks/                  ← Templates for user-level setup
│       ├── tech-debt-sweep.sh
│       └── cache-check.sh
│
~/.cursor/                            ← User home directory (not in repo)
├── hooks.json                        ← Optional user config
└── hooks/
    ├── tech-debt-sweep.sh           ← Optional; you install this
    └── cache-check.sh               ← Optional; you install this
```

---

## Key Insights

✅ **Project-level hooks** enforce team standards (checked into git)
✅ **User-level hooks** are optional per-developer tools
✅ **Deterministic > Rule-based** — hooks always run; rules rely on discipline
✅ **Security-first** — secret detection + dangerous command blocker align with CLAUDE.md Rule 14
✅ **Audit trail** — every hook action is logged for compliance (Rule 15)
✅ **Non-intrusive** — hooks run silently in background; don't interrupt your flow

---

## Next Steps

1. ✅ Project-level hooks are active (auto-format, YAML validation, dangerous blocker, secret detection)
2. 📦 Install user-level hooks following setup instructions above
3. 🧹 Run tech debt sweep at end of sprint to track code health
4. 📊 Archive sweep reports and compare trends over time

For detailed setup and troubleshooting, see [.cursor/HOOKS-SETUP.md](.cursor/HOOKS-SETUP.md).
