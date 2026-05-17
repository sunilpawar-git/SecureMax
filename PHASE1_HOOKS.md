# Phase 1 Hooks: Security & Data Integrity

**Status**: ✅ Implemented

Two critical hooks added to your commit workflow:

---

## Hook 1: Secrets Detection

**File**: `scripts/check-secrets.sh`

**When it runs**: Before every `git commit`

**What it detects**:
- AWS Access Keys (AKIA...)
- GitHub Tokens (ghp_, ghu_, ghs_, gho_)
- Gemini API Keys
- Database credentials (passwords, connection strings)
- NextAuth secrets
- OAuth Client Secrets (Google, etc.)
- Razorpay credentials
- Private Keys (RSA, PGP)
- JWT tokens (warns only, doesn't block)
- .env files (should never be committed)

**If secrets are found**:
```
❌ GitHub token detected
❌ .env file detected in staged changes

⚠️  If these are test/example values, review them manually:
   git diff --cached | grep -E '(API|KEY|SECRET|PASSWORD)' -i

To commit anyway (use only if you're sure):
   git commit --no-verify
```

**Why this matters** (Rule 14 — Security by Design):
- Your project handles sensitive data: Gemini API keys, database credentials, OAuth tokens
- Leaking secrets in git history is nearly impossible to undo
- Even private repos can be compromised

---

## Hook 2: Question Graph YAML Validation

**File**: `scripts/validate-yaml.sh`

**When it runs**: Before every `git commit` (only if you modified question-graph/*.yaml)

**What it validates**:
- ✅ Valid YAML syntax
- ✅ Entry node exists and is in graph
- ✅ All node IDs referenced in edges exist
- ✅ No orphan nodes (unreachable from entry)
- ✅ No dead ends (non-terminal nodes with no outgoing edges)
- ✅ Terminal nodes are reachable
- ✅ CPP domain tags are valid (CPP-01 through CPP-07)
- ✅ Question types are valid (single_choice, multi_choice, text_input, terminal)

**If validation fails**:
```
ERROR: hni.yaml: hni_q2_location: edge target 'invalid_node' not found
ERROR: hni.yaml: hni_q5_budget: non-terminal node with no edges (dead end)
ERROR: hni.yaml: No terminal node reachable from entry

❌ Question graph validation failed
```

**Why this matters** (Rule 8 — Read Before You Write + Rule 13 — CPP Seven Precis Is SSOT):
- The question graph is your source of truth (SSOT)
- A broken graph = users stuck mid-questionnaire = broken user experience
- This hook catches graph errors **before** they reach production

---

## Testing the Hooks

### Test Secrets Detection (with a fake secret)

```bash
# Stage a test file with a fake secret
echo "GEMINI_API_KEY=test_key_12345" > test-secret.env
git add test-secret.env

# Try to commit
git commit -m "test: try to commit secrets"

# Output should show:
# ❌ .env file detected in staged changes
# ❌ Gemini API key pattern detected
# [commit blocked, exit code 2]

# Clean up
git reset HEAD test-secret.env
rm test-secret.env
```

### Test YAML Validation (with broken YAML)

```bash
# Modify a question graph file and introduce an error
# (e.g., reference a non-existent node)

# Then try to commit
git commit -m "test: break question graph"

# Output should show:
# ERROR: hni.yaml: edge target 'invalid_node' not found
# [commit blocked, exit code 2]
```

---

## How to Handle Blocked Commits

### Scenario 1: Real Secret (API Key, Token, Credential)
**Do this**:
1. Remove the secret immediately
2. Regenerate/rotate the credential (it's compromised if you pushed)
3. Commit again without the secret

**Example**:
```bash
# Remove the secret
rm .env
# Or edit the file and remove sensitive line
nano src/config.ts

# Stage the clean version
git add .
git commit -m "remove exposed credentials"
```

### Scenario 2: False Positive (Test Data, Example, Comment)
**Do this**:
1. Review what triggered the block: `git diff --cached | grep -E '(API|KEY|SECRET)' -i`
2. If it's truly safe (e.g., example value, test fixture), commit with override:

```bash
git commit --no-verify -m "add: test fixtures with safe example credentials"
```

⚠️ **Use `--no-verify` sparingly.** It bypasses ALL safety checks. Only use when you're 100% sure.

### Scenario 3: YAML Validation Error
**Do this**:
1. Read the error message carefully
2. Fix the YAML: `python question-graph/validate.py`
3. Commit again

**Example**:
```
ERROR: hni.yaml: hni_q5_location: edge target 'typo_node' not found

# Fix: correct the node ID in hni.yaml
# Then commit again
```

---

## What's Protected

| Asset | Hook | Protection |
|-------|------|-----------|
| Gemini API Key | ✅ Secrets | Blocks commit |
| Database Password | ✅ Secrets | Blocks commit |
| GitHub Token | ✅ Secrets | Blocks commit |
| Razorpay Key | ✅ Secrets | Blocks commit |
| NextAuth Secret | ✅ Secrets | Blocks commit |
| .env file | ✅ Secrets | Blocks commit |
| Question Graph | ✅ YAML | Blocks broken graph |
| Broken edges | ✅ YAML | Blocks commit |
| Orphan nodes | ✅ YAML | Blocks commit |
| Dead ends | ✅ YAML | Blocks commit |

---

## Performance Impact

**Secrets hook**: ~100ms (regex scan of staged changes)
**YAML validation hook**: ~50ms (Python YAML parser)

**Total**: ~150ms per commit = **negligible**

---

## Next Steps

1. **Try committing now**: `git add . && git commit -m "chore: add phase 1 hooks"`
   - The secrets hook will scan your commit
   - The YAML hook will validate question graphs
   - Both should pass

2. **Monitor for 1 week**: Watch for false positives or noisy alerts

3. **If things go smoothly**, proceed to Phase 2 (test coverage + encryption validation) in 2 weeks

---

## Configuration

Both hooks are configured in `.claude/settings.json`:

```json
"pre-tool:bash": [
  {
    "matcher": "git commit",
    "command": "bash scripts/check-secrets.sh",
    "description": "Detect API keys, tokens, credentials"
  },
  {
    "matcher": "git commit",
    "command": "bash scripts/validate-yaml.sh",
    "description": "Validate question graph YAML"
  }
]
```

To disable a hook temporarily, comment it out or set `"matcher": "^$"` (never matches).

---

## Security Note

These hooks protect against **accidental leaks**. They do not protect against:
- Deliberately committed secrets (if you want to leak, you will)
- Secrets already in git history (use `git-secrets --scan` to audit)
- Secrets in environment variables (use `.env.local`, never `.env`)

**Best practice**: Add `.env` and `.env.local` to `.gitignore` (should already be there).

```bash
cat .gitignore | grep "^\.env"
```

If not, add it:
```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

---

## Troubleshooting

### "Hook failed: python: command not found"
The YAML validation hook needs Python. Ensure Python is in your PATH:
```bash
python --version
```

If not found, install Python 3.9+ or update your PATH.

### "Secrets hook is too noisy"
If you're getting false positives, edit `scripts/check-secrets.sh` and adjust the regex patterns to be more specific.

### "I need to skip the hooks for a commit"
```bash
git commit --no-verify -m "emergency commit"
```

But this should be rare. If you're skipping hooks frequently, let me know — we may need to adjust the rules.

---

**Last updated**: 2026-05-17
