# Hooks & Code Quality Setup

This document explains the automated code quality system now integrated into your project.

---

## What Was Added

### 1. **Formatting Hooks** (Post-Edit, Automatic)
Runs **immediately after you save a file**.

**Files covered**:
- `*.ts`, `*.tsx`, `*.js`, `*.jsx` → Prettier
- `*.py` → Black

**What happens**:
```
You edit src/App.tsx
     ↓
Hook triggers (post-tool:edit)
     ↓
npx prettier --write src/App.tsx
     ↓
File auto-formatted (no action needed from you)
```

**Why**: Prevents formatting churn in commits. You never commit unformatted code.

---

### 2. **Pre-Commit Guard** (Before git commit)
Runs **when you try to commit code**.

**Checks run**:
1. ✅ ESLint (TypeScript/JavaScript)
2. ✅ Type check (tsc --noEmit)
3. ✅ Ruff (Python lint)
4. ⚠️ MyPy (Python types, non-blocking)

**What happens**:
```
You run: git commit -m "..."
     ↓
Hook triggers (pre-tool:bash matcher: git commit)
     ↓
Runs: bash scripts/pre-commit-check.sh
     ↓
If ANY check fails (exit code 2):
  ❌ Commit is BLOCKED
  📝 Error message shown
  🔧 You fix the error
  🔄 Try commit again
     ↓
If ALL checks pass:
  ✅ Commit proceeds
```

**Command**: `bash scripts/pre-commit-check.sh` (manual run anytime)

---

### 3. **Tech Debt Audit Script** (Manual, Run at Sprint End)
A comprehensive report you generate **once per sprint** (Friday end-of-day).

**Checks included**:
1. ESLint violations
2. Type errors
3. Python lint issues
4. Test coverage summary
5. Code hotspots (most-changed files)
6. Recent commit activity
7. Potential dead code
8. Dependency vulnerabilities
9. Security/secrets scan
10. **Action items** (phased fix plan)

**Command**:
```bash
bash scripts/tech-debt-audit.sh > SPRINT_AUDIT.md
```

**Output**: Markdown report you can review, commit, and track in your project wiki.

---

## Files Created

```
.claude/settings.json          ← Updated with hook config
scripts/
  ├── pre-commit-check.sh      ← Guard before git commit
  └── tech-debt-audit.sh       ← Weekly sprint audit
HOOKS_SETUP.md                 ← This file
```

---

## Your Weekly Workflow

### **During Development**
```bash
# Day 1–4 of sprint
# Edit files normally
# Formatting hooks auto-run (transparent)
# When you commit:
#   → Pre-commit guard runs
#   → Blocks if violations found
#   → You fix + retry
```

### **End of Sprint (Friday, ~30 min)**
```bash
# Run the audit
bash scripts/tech-debt-audit.sh > SPRINT_AUDIT_2026-05-17.md

# Open the report
cat SPRINT_AUDIT_2026-05-17.md

# Manually review:
# - Section 1–3: Fix immediately if errors exist
# - Section 5–7: Identify hotspots and dead code
# - Section 10: Draft phase-wise plan for next sprint

# Commit the report (optional, but recommended)
git add SPRINT_AUDIT_2026-05-17.md
git commit -m "docs: sprint audit $(date +%Y-%m-%d)"
```

### **Next Sprint Planning**
- Review last sprint's audit
- Pick 3–5 highest-impact items
- Build fixes into user stories

---

## Configuration

### Formatting Hook Config
**File**: `.claude/settings.json`

```json
"hooks": {
  "post-tool:edit": [
    {
      "matcher": ".*\\.(ts|tsx|js|jsx)$",
      "command": "npx prettier --write '{file}' 2>/dev/null || true",
      "description": "Auto-format TypeScript/JavaScript files"
    },
    {
      "matcher": ".*\\.py$",
      "command": "cd ai-service && python -m black '{file}' 2>/dev/null || true",
      "description": "Auto-format Python files"
    }
  ]
}
```

**To modify**: Edit `.claude/settings.json` and adjust the `matcher` regex or `command`.

---

## Troubleshooting

### "Hook failed: ruff: command not found"
**Fix**: Install ruff in ai-service virtual environment
```bash
cd ai-service
pip install ruff
```

### "Hook failed: mypy: command not found"
**Fix**: Install mypy (optional, non-blocking for commits)
```bash
cd ai-service
pip install mypy
```

### "Pre-commit hook blocked my commit"
**This is intentional.** The hook prevents code with errors from being pushed.

**Steps**:
1. Read the error message
2. Fix the issue (ESLint, type, etc.)
3. Save the file (formatting hook runs auto-fixes)
4. Try commit again

### "I need to skip the hook (emergency only)"
```bash
git commit --no-verify -m "..."
```
⚠️ **Use only in emergencies.** This bypasses ALL safety checks.

---

## What NOT To Do

❌ Don't edit the hook commands directly in `.claude/settings.json` unless you understand what they do.

❌ Don't delete `scripts/pre-commit-check.sh` — it's your safety net.

❌ Don't run `git commit --no-verify` habitually — defeats the purpose.

---

## Monitoring & Iteration

Check these metrics weekly:
- **Commit success rate**: Did any commits get blocked? Why?
- **Audit report quality**: Is the report finding real issues?
- **Time spent**: Does the pre-commit hook add noticeable delay?

If the hook is too slow or too noisy, we can adjust:
- Reduce the scope of type-checking
- Split hooks by file type
- Add a `--fast` mode for local dev

---

## Next Steps (Optional)

If this system works well after 2 sprints:
1. **Add CI/CD gate**: Require the same checks in GitHub Actions
2. **Add pre-push hook**: Catch issues before you push (not just before commit)
3. **Add dependency audit**: Scheduled check for vulnerable packages
4. **Add security scanning**: Check for hardcoded secrets

But for now, **start with these three**, measure impact, and iterate.

---

**Questions?** Reference CLAUDE.md Rule 12: "Fail Loud." If the hooks aren't helping, let me know.
