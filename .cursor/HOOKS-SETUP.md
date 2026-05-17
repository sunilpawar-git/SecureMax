# Cursor Hooks Setup Guide

This guide explains the Cursor hooks system for Security Crawler and how to configure both project-level and user-level hooks.

## Overview

Hooks are deterministic automations that run at specific points in your workflow. They ensure code quality, security, and maintainability without relying on manual discipline.

### Project-Level Hooks (Already Installed)

These hooks are version-controlled in `.cursor/hooks.json` and shared across all team members:

| Hook | Event | Purpose |
|------|-------|---------|
| **Auto-Format** | `afterFileEdit` | Auto-formats `.ts`, `.tsx`, `.css`, `.py` files using Prettier/ruff |
| **YAML Validation** | `afterFileEdit` | Validates `question-graph/*.yaml` schema after edits |
| **Dangerous Command Blocker** | `beforeShellExecution` | Blocks risky commands (`rm -rf`, `git push --force`, SQL mutations) |
| **Secret Detection** | `beforeSubmitPrompt` | Scans prompts for API keys, tokens, and PII before submission |

**Status**: ✅ Already installed and active.

### User-Level Hooks (Optional, Per-Developer)

These hooks live in `~/.cursor/hooks/` and are managed individually by each developer.

| Hook | Event | Purpose |
|------|-------|---------|
| **Tech Debt Sweep** | `stop` | End-of-session code quality audit |
| **Cache Inspector** | `stop` | Warns about large cache artifacts (optional) |

---

## Setup User-Level Hooks

### Prerequisites

Ensure you have the following installed locally:
- `jq` (JSON query tool)
- `npm` / `npx` (for running ESLint, Prettier)
- `python3` and `ruff` (for Python linting)
- `pytest` (for test execution)
- `bandit` (for Python security checks)
- `npm audit` (bundled with npm)

### Installation Steps

#### 1. Create the hooks directory (if it doesn't exist)

```bash
mkdir -p ~/.cursor/hooks
```

#### 2. Copy the tech debt sweep script

```bash
cp .cursor/user-hooks/tech-debt-sweep.sh ~/.cursor/hooks/tech-debt-sweep.sh
chmod +x ~/.cursor/hooks/tech-debt-sweep.sh
```

#### 3. (Optional) Copy the cache inspector script

```bash
cp .cursor/user-hooks/cache-check.sh ~/.cursor/hooks/cache-check.sh
chmod +x ~/.cursor/hooks/cache-check.sh
```

#### 4. Create or update your user-level hooks.json

```bash
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
```

If you also want the cache inspector:

```bash
cat > ~/.cursor/hooks.json << 'EOF'
{
  "version": 1,
  "hooks": {
    "stop": [
      {
        "command": "./hooks/tech-debt-sweep.sh",
        "timeout": 120
      },
      {
        "command": "./hooks/cache-check.sh",
        "timeout": 30
      }
    ]
  }
}
EOF
```

#### 5. Restart Cursor

After updating `~/.cursor/hooks.json`, restart Cursor to reload hooks.

---

## Hook Behavior Details

### Auto-Format Hook

**When it runs**: After you edit any `.ts`, `.tsx`, `.css`, or `.py` file  
**What it does**: Automatically formats the file using Prettier (TS/CSS) or ruff format (Python)  
**Output**: Displays confirmation in Claude's context

**Note**: This is fail-open — if formatting fails, the hook logs a warning but doesn't block your work.

### YAML Validation Hook

**When it runs**: After you edit any file in `question-graph/*.yaml`  
**What it does**: Runs `python question-graph/validate.py` to check schema validity  
**Output**: Shows validation result or error details

**Note**: The question graph is the SSOT (Single Source of Truth). Schema validation prevents broken graphs from being seeded into the database.

### Dangerous Command Blocker

**When it runs**: Before any shell command executes  
**What it blocks**:
- `rm -rf` commands (outside `.cursor/` directory)
- `git push --force` (rewrites remote history)
- `UPDATE`/`DELETE` SQL without `WHERE` clause
- `DROP DATABASE` / `DROP TABLE` commands
- Prisma operations with `NODE_ENV=production`

**Behavior**: Asks you to confirm risky commands before proceeding  
**Note**: This hook uses `failClosed: true` — if it fails, the command is blocked entirely.

### Secret Detection Hook

**When it runs**: Before you submit a prompt to Claude  
**What it detects**:
- API key patterns (`RAZORPAY_KEY=`, `GOOGLE_CLIENT_SECRET=`, etc.)
- AWS/Stripe key formats (`sk_live_`, `pk_live_`, `AKIA...`)
- Bearer tokens and JWT patterns
- Firebase credentials
- Private cryptographic keys (PEM headers)
- Database connection strings with embedded passwords
- Emails paired with passwords or keys

**Behavior**: Warns you and asks for approval before submitting  
**Note**: This is fail-open — you can choose to proceed after review.

### Tech Debt Sweep Hook

**When it runs**: After Claude finishes a response (end of session)  
**What it scans**:
- **Linting violations**: ESLint + ruff check
- **Dead code**: Unused imports (ESLint rules)
- **Test gaps**: Jest + pytest coverage and failures
- **Security issues**: npm audit + Bandit
- **TODO/FIXME comments**: Grepped from source code

**Output**: Generates a report file `./DEBT-SWEEP-<timestamp>.md` with findings ranked by severity (critical → high → medium → low)

**Note**: Run this at the end of your sprint to track code health over time.

### Cache Inspector Hook (Optional)

**When it runs**: After Claude finishes a response  
**What it checks**: Size of `node_modules/`, `.next/`, `dist/`, `__pycache__/`  
**Output**: Warns if cache directories exceed thresholds (e.g., `node_modules > 500MB`)

---

## Troubleshooting

### Hooks Not Loading?

1. **Verify the hooks.json exists**: 
   - Project-level: `/.cursor/hooks.json`
   - User-level: `~/.cursor/hooks.json`

2. **Check the syntax**: Run `jq . ~/.cursor/hooks.json` to validate JSON

3. **Restart Cursor**: After modifying hooks.json, restart the IDE to reload

4. **Check the Hooks tab**: In Cursor settings, go to **Hooks** to see loaded/failed hooks

### Hook Script Not Running?

1. **Verify execute permissions**: `ls -la ~/.cursor/hooks/`  
   All scripts should show `-rwxr-xr-x` (executable)

2. **Check dependencies**: Ensure all required binaries are installed and on `$PATH`
   ```bash
   command -v npx && echo "✓ npx found" || echo "✗ npx not found"
   command -v ruff && echo "✓ ruff found" || echo "✗ ruff not found"
   command -v python3 && echo "✓ python3 found" || echo "✗ python3 not found"
   ```

3. **Test the script directly**: 
   ```bash
   echo '{ "file_path": "src/test.ts" }' | ~/.cursor/hooks/format-edited-files.sh
   ```

4. **Check the Hooks output channel**: Cursor logs hook execution; review for errors

### Hook Timeouts?

If hooks are timing out (especially tech debt sweep), increase the timeout in `hooks.json`:

```json
{
  "command": "./hooks/tech-debt-sweep.sh",
  "timeout": 180
}
```

Timeout is in seconds. Adjust based on your project size and CI speed.

### Secret Detection False Positives?

The secret detection hook uses regex patterns that may match false positives (e.g., documentation examples). If you see warnings on harmless text, you can:

1. Review the detected pattern carefully
2. Proceed with submission (the hook is fail-open)
3. Open an issue or update the regex patterns in `.cursor/hooks/detect-secrets-in-prompt.sh`

---

## Advanced: Customizing Hooks

### Modifying Hook Behavior

All hook scripts are plain bash files in `.cursor/hooks/`. You can edit them to:
- Add/remove detection patterns
- Adjust timeout thresholds
- Change formatting preferences
- Customize report output

### Disabling a Specific Hook

Edit `~/.cursor/hooks.json` or `/.cursor/hooks.json` and comment out or remove the hook entry:

```json
{
  "hooks": {
    "stop": [
      {
        "command": "./hooks/tech-debt-sweep.sh",
        "timeout": 120
      }
      // "command": "./hooks/cache-check.sh"  ← Disabled
    ]
  }
}
```

### Testing Hooks

Manually trigger a hook to test it:

```bash
# Test format hook
echo '{ "file_path": "src/test.ts" }' | ~/.cursor/hooks/format-edited-files.sh

# Test secret detection
echo '{ "prompt": "Here is my API key: sk_live_abc123" }' | ~/.cursor/hooks/detect-secrets-in-prompt.sh

# Test dangerous command blocker
echo '{ "command": "rm -rf src/" }' | ~/.cursor/hooks/block-dangerous-commands.sh
```

---

## FAQ

**Q: Will hooks slow down my workflow?**  
A: Project-level hooks are fast (< 1s each). The tech debt sweep runs only at session end, so it doesn't interrupt your work.

**Q: Can I override a hook?**  
A: Yes. Disable the hook in hooks.json, or modify the script to suit your needs. For team consistency, discuss changes before committing.

**Q: What if a hook blocks something I need to do?**  
A: You have two options:
1. Temporarily disable the hook in settings
2. Ask the hook to approve (if it's an `ask` permission) and explain why it's safe

**Q: Are hooks run in the CI pipeline?**  
A: No. Hooks are local-only developer tools. CI has its own checks (ESLint, ruff, pytest, etc.) defined in `.github/workflows/ci-cd.yml`.

**Q: How do I track debt sweep results over time?**  
A: Each sweep generates a timestamped report. Archive them in a `DEBT-SWEEPS/` directory and compare trends sprint-to-sprint.

---

## Next Steps

1. ✅ Project-level hooks are ready (auto-format, YAML validation, dangerous command blocker, secret detection)
2. 📦 Install user-level hooks following the setup steps above
3. 📊 Run a tech debt sweep at the end of your next sprint
4. 📝 Review the generated report and create tasks for identified issues

For more information, see the [Cursor Hooks Documentation](https://docs.cursor.sh/advanced/hooks).
