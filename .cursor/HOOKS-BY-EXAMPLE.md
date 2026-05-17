# Cursor Hooks - By Example Guide

This guide shows you **exactly what happens** when you use Cursor with hooks enabled, using real-world scenarios.

## Quick Answer: Do I Need to Do Anything?

**Project-Level Hooks**: ✅ **AUTOMATIC** — They run on their own, no action needed  
**User-Level Hooks**: ✅ **AUTOMATIC** (after setup) — They run at session-end

Hooks are **not commands you run**. They're **automations that trigger** at specific moments.

---

## How Hooks Work (The Mechanism)

Think of hooks like "invisible helpers" that watch for specific events:

```
You do something (edit a file, run a command, etc.)
         ↓
Cursor detects the event
         ↓
Hook script runs automatically (you don't type anything)
         ↓
Hook does its job (format, validate, block, etc.)
         ↓
Result appears in Cursor's context
```

**You don't manually trigger hooks. They're automatic.**

---

## Scenario 1: Auto-Format Hook (Happens Automatically)

### The Setup
You have the auto-format hook installed (project-level, already active).

### What You Do
You edit `src/auth.ts` and write some code with inconsistent formatting:

```typescript
// src/auth.ts (badly formatted)
function  login(  email  ,  password  )  {
  const user=authenticate(email,password)
    if  (  user  )  {
      return  user
    }
}
```

You save the file. **That's it. You did one thing: save.**

### What Happens Automatically (Behind the Scenes)

**Step 1: Cursor detects the file edit**
- Event triggered: `afterFileEdit` on `src/auth.ts`

**Step 2: Hook script runs automatically**
- `.cursor/hooks/format-edited-files.sh` starts
- Script detects: `.ts` file → use Prettier
- Script runs: `npx prettier --write src/auth.ts`

**Step 3: File is formatted**
- Before:
  ```typescript
  function  login(  email  ,  password  )  {
    const user=authenticate(email,password)
  ```
- After (Prettier formatted):
  ```typescript
  function login(email, password) {
    const user = authenticate(email, password);
  ```

**Step 4: You see it in Cursor's context**
- Context message: "Auto-formatted: src/auth.ts (Prettier)"
- Your file is now clean automatically

**You don't need to do anything.** The hook did it for you.

---

## Scenario 2: YAML Validation Hook (Catches Errors Automatically)

### The Setup
You have the YAML validation hook installed (project-level, already active).

### What You Do
You edit `question-graph/hni.yaml` and make a syntax error:

```yaml
# question-graph/hni.yaml
hni_q1_property_type:
  question: "What type of property do you own?"
  edges:
    - target: hni_q2_location
      condition: answer == "residential"  # ← Syntax error here (wrong format)
    - target: hni_q3_other
```

You save the file.

### What Happens Automatically

**Step 1: Cursor detects the file edit**
- Event: `afterFileEdit` on `question-graph/hni.yaml`

**Step 2: Hook script runs**
- `.cursor/hooks/validate-question-graph.sh` starts
- Script runs: `python question-graph/validate.py question-graph/hni.yaml`

**Step 3: Validation fails**
- Python script finds the syntax error
- Returns error message

**Step 4: You see the error in Cursor**
- Context message:
  ```
  ❌ YAML schema validation failed: question-graph/hni.yaml
  
  Error: Invalid condition syntax on line 5
  Expected format: condition_type:value (e.g., "any:*" or "last_answer:yes")
  
  Please review the YAML structure.
  ```

**You now know to fix it.** You can edit the line and the hook will validate again on save.

---

## Scenario 3: Dangerous Command Blocker (Prevents Accidents)

### The Setup
You have the dangerous command blocker installed (project-level, already active).

### What You Do
You're trying to clean up old test files. You want to delete everything in `src/old-tests/`.

You type in Cursor's terminal:
```bash
rm -rf src/old-tests/
```

You press Enter to execute.

### What Happens Automatically

**Step 1: Cursor detects the shell command**
- Event: `beforeShellExecution` on `rm -rf src/old-tests/`

**Step 2: Hook script runs**
- `.cursor/hooks/block-dangerous-commands.sh` starts
- Script analyzes the command
- Script detects: `rm -rf` pattern
- Script checks: NOT in `.cursor/` directory → risky!

**Step 3: Hook blocks the command and asks**
- Command is **BLOCKED** (doesn't execute)
- You see a message in Cursor:
  ```
  ⚠️ RISKY: This command uses 'rm -rf' which is destructive. 
  Please review before proceeding.
  ```

**Step 4: You have choices**
1. **Approve it**: If you're sure it's safe, you can say "yes" and the command runs
2. **Abort**: Type a different, safer command
3. **Modify**: Use `rm -i` (interactive delete) instead:
   ```bash
   rm -i src/old-tests/*
   ```

**The hook prevented accidental data loss.**

---

## Scenario 4: Secret Detection Hook (Prevents Leaks)

### The Setup
You have the secret detection hook installed (project-level, already active).

### What You Do
You're debugging a payment integration. You want to ask Claude for help with your Razorpay configuration. You're typing in Cursor:

```
I'm testing Razorpay integration. Here's my API key: RAZORPAY_KEY=pk_live_abc123xyz789

Can you help me debug why payments aren't working?
```

You click "Send" to submit to Claude.

### What Happens Automatically

**Step 1: Cursor detects your prompt submission**
- Event: `beforeSubmitPrompt` (you pressed Send)

**Step 2: Hook script runs**
- `.cursor/hooks/detect-secrets-in-prompt.sh` starts
- Script scans your prompt text
- Script detects: `RAZORPAY_KEY=pk_live_` pattern
- This is a **live API key** (pk_live_)

**Step 3: Hook warns you**
- Submission is **BLOCKED** (prompt not sent)
- You see this warning:
  ```
  🔒 SECURITY WARNING: Potential secrets or PII detected in your prompt:
  
    • Possible API key or environment variable assignment
    • Possible Stripe API key format detected
  
  Do NOT submit this prompt if you want to keep these secrets private. 
  Review and remove sensitive data before proceeding.
  ```

**Step 4: You have choices**
1. **Remove the secret**: Delete the API key from your message
   ```
   I'm testing Razorpay integration. I have an API key configured.
   Can you help me debug why payments aren't working?
   ```
   Then submit → it goes through!

2. **Proceed if you're sure**: Some hooks allow you to approve anyway, but this one prevents you for safety.

**The hook prevented accidental secret leakage.**

---

## Scenario 5: Tech Debt Sweep Hook (Runs at Session-End)

### The Setup
You installed the user-level tech debt sweep hook (optional, but you did it).

### What You Do
You've been working on the project for 2 hours, making various code changes:
- Added a new feature to the questionnaire
- Fixed some bugs
- Updated some test files
- Made random edits

You're done for the day. You close Cursor or signal the end of the session.

### What Happens Automatically

**Step 1: Cursor detects end of session**
- Event: `stop` (session complete)

**Step 2: Hook script runs automatically**
- `~/.cursor/hooks/tech-debt-sweep.sh` starts
- This runs in the background (doesn't interrupt your work)

**Step 3: Hook scans the entire project**
- Runs: `npm run lint` → checks for ESLint violations
- Runs: `cd ai-service && ruff check .` → checks Python linting
- Runs: `npm run test:ci` → checks test coverage
- Runs: `npm audit --production` → checks for security vulnerabilities
- Runs: `cd ai-service && bandit -r .` → checks Python security
- Greps for: `// TODO`, `# TODO`, `// FIXME` comments

**Step 4: Report is generated**
- File created: `DEBT-SWEEP-20260517_085324.md`

**Step 5: You see the results**
- Context message: "Tech debt sweep completed. Report: ./DEBT-SWEEP-20260517_085324.md"
- You can open the report and see:

```markdown
# Security Crawler - Tech Debt Sweep Report

Generated: 2026-05-17 08:53:24

## Summary

| Category | Count | Severity |
|----------|-------|----------|
| Linting Violations | 2 | 🔴 High |
| Dead Code Issues | 0 | 🟢 None |
| Test Gaps | 1 | 🔴 High |
| Security Issues | 0 | 🟢 None |
| TODO/FIXME Comments | 3 | 🟡 Medium |

## Critical Issues 🔴

### Linting Violations (2)
- Unused variable in src/auth.ts:42
- Missing import in src/api.ts:18

### Test Gaps (1)
- Jest: Coverage below 70% (currently 65%)

## Medium Priority Issues 🟡

### TODO/FIXME Comments (3)
- src/components/Auth.tsx:15: TODO: Implement OAuth callback
- ai-service/main.py:42: FIXME: Handle rate limiting
- src/utils/crypto.ts:88: TODO: Add error recovery

## Remediation Plan

### This Sprint 🎯
1. Fix all linting violations (0 → 2)
2. Increase test coverage to 70%+
3. Convert 2 of 3 TODOs to sprint tasks
```

**Step 6: You review and act**
- You look at the report
- You create GitHub issues for the findings
- You track progress across sprints

**This runs automatically at session-end. No manual work needed.**

---

## Common Questions

### Q: Do I need to trigger hooks manually?
**A:** No. Hooks are automatic. They trigger based on events:
- After you save a file (afterFileEdit)
- Before you run a command (beforeShellExecution)
- Before you submit a prompt (beforeSubmitPrompt)
- At the end of your session (stop)

### Q: Can I stop a hook from running?
**A:** Yes, but not recommended:
1. Remove the hook from `.cursor/hooks.json`
2. Restart Cursor
3. The hook won't run anymore

**But why would you?** Hooks are there to help you!

### Q: What if a hook blocks something I actually need to do?
**A:** The hook will ask for confirmation (if it's an "ask" hook). You can approve it if you're sure it's safe.

Example: If you genuinely need to delete a folder:
```bash
rm -rf src/old-code/
↓ Hook blocks it
⚠️ This looks risky. Approve?
↓ You say: "Yes, I'm sure"
→ Command runs
```

### Q: Do hooks slow down my work?
**A:** No. Project-level hooks are fast (< 1 second each). User-level hooks run at session-end, so they don't interrupt you.

### Q: Can I see when a hook runs?
**A:** Yes! Open Cursor's **Hooks** tab in settings to see logs of when hooks ran and what happened.

### Q: What if I'm working and a hook fails?
**A:** Hooks are designed to fail gracefully:
- **Format hook fails** → You continue; file isn't formatted. You can format manually or try again on next save.
- **YAML validation fails** → Warning shown; you can still save. Fix the YAML and it will validate on next save.
- **Dangerous blocker fails** → Command is still blocked (safe-by-default).
- **Secret detection fails** → Warning shown; you can still submit (safe-by-default).

### Q: Do hooks work in CI/CD?
**A:** No. Hooks are local developer tools. CI has its own checks (ESLint, pytest, etc. in `.github/workflows/ci-cd.yml`).

### Q: Can I customize a hook?
**A:** Yes! All hook scripts are plain bash. You can edit them:
- Project-level: `.cursor/hooks/*.sh`
- User-level: `~/.cursor/hooks/*.sh`

Example: Want to increase the timeout on tech debt sweep?
Edit `.cursor/hooks.json`:
```json
{
  "command": "./hooks/tech-debt-sweep.sh",
  "timeout": 180  // Increase from 120 to 180 seconds
}
```

---

## Your Daily Workflow with Hooks

Here's what a typical day looks like with hooks enabled:

### Morning
1. Start Cursor
2. Hooks are loaded automatically (no setup needed)

### During the day
**Edit TypeScript:**
```bash
You: Edit src/components/Button.tsx
Hook: Auto-formats (you see: "Auto-formatted: src/components/Button.tsx")
```

**Try a risky command:**
```bash
You: Type "rm -rf node_modules/"
Hook: Blocks it (you see: "⚠️ RISKY: This command uses 'rm -rf'...")
You: Type safer alternative: "rm -rf node_modules && npm ci"
```

**Write a prompt with a secret:**
```bash
You: Type prompt with "RAZORPAY_KEY=pk_live_..."
You: Press Send
Hook: Blocks it (you see: "🔒 SECURITY WARNING...")
You: Remove the secret, press Send again → it goes through
```

### End of day
```bash
You: Close Cursor (or end session)
Hook: Automatically runs tech debt sweep
You: See: "Tech debt sweep completed. Report: ./DEBT-SWEEP-20260517_173245.md"
You: Open report, review findings, create GitHub issues
```

**That's it. Hooks handled everything automatically.**

---

## Summary: Hooks Are Automatic

| Hook | When It Runs | What You Do | What It Does |
|------|-------------|-----------|------------|
| Auto-Format | You save a TS/CSS/Python file | Save the file | Formats it automatically |
| YAML Validation | You save a YAML file in question-graph/ | Save the file | Validates schema, warns if broken |
| Dangerous Blocker | You try to run a risky command | Type the command | Blocks it, asks for approval |
| Secret Detection | You submit a prompt | Click Send | Scans for secrets, warns if found |
| Tech Debt Sweep | End of your session | Nothing | Generates report automatically |

**You don't need to remember to run anything. Hooks just work.**

---

## Next Steps

1. ✅ Review this guide to understand how hooks work
2. ✅ Try editing a TS file → watch auto-format happen
3. ✅ Try typing `rm -rf test/` → watch the blocker stop you
4. ✅ Add a secret to a prompt → watch secret detection warn you
5. ✅ At sprint-end, install tech debt sweep (see HOOKS-SETUP.md)
6. ✅ Review the tech debt report and create GitHub issues

**That's all you need to know. Hooks are automatic helpers, not commands to remember.**
