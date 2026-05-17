# Cursor Hooks - Your Quick Start (5 Minutes)

**TL;DR: Hooks are automatic helpers. You don't need to do anything special. They run on their own.**

---

## The One Thing You Need to Know

Hooks are **events that trigger automatically**. You don't run commands. They just happen.

```
Example: You save a file → Hook auto-formats it → You see confirmation
```

That's it. No manual steps.

---

## Project-Level Hooks (Already Active - Nothing to Setup)

These 4 hooks are **already running right now**:

### 1. Auto-Format ✓ (Active)
- **When**: You save any `.ts`, `.tsx`, `.css`, or `.py` file
- **What happens**: File gets auto-formatted
- **Your action**: Just save the file (that's all!)

**Example**:
```
You: Save src/auth.ts (even if messy)
   ↓
Hook: Automatically runs Prettier
   ↓
Result: File is now formatted nicely
```

### 2. YAML Validation ✓ (Active)
- **When**: You save any file in `question-graph/*.yaml`
- **What happens**: Schema is validated
- **Your action**: Just save the file

**Example**:
```
You: Save question-graph/hni.yaml (with syntax error)
   ↓
Hook: Validates YAML schema
   ↓
Result: You see error message → Fix it → Save again → Valid!
```

### 3. Dangerous Command Blocker ✓ (Active)
- **When**: You try to run a risky command (`rm -rf`, `git push --force`, etc.)
- **What happens**: Command is blocked, you're asked to confirm
- **Your action**: Approve it (if sure) or use a safer command

**Example**:
```
You: Type "rm -rf src/old/"
   ↓
Hook: Blocks the command
   ↓
You: See warning → Either approve or change command
```

### 4. Secret Detection ✓ (Active)
- **When**: You submit a prompt with an API key, password, or token
- **What happens**: Prompt is blocked, you're warned
- **Your action**: Remove the secret and resubmit

**Example**:
```
You: Submit prompt: "My API key is sk_live_abc123"
   ↓
Hook: Detects the secret
   ↓
You: See warning → Remove secret → Resubmit
```

---

## User-Level Hooks (Optional - One-Time Setup)

### Tech Debt Sweep (Optional)
- **When**: End of your session (you close Cursor)
- **What happens**: Automatic code quality audit runs, generates report
- **Your action**: (Optional) Install once, then it's automatic

**To install** (5 minutes):
```bash
# 1. Create folder
mkdir -p ~/.cursor/hooks

# 2. Copy the script
cp .cursor/user-hooks/tech-debt-sweep.sh ~/.cursor/hooks/

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

**Then**:
```
You: End session (close Cursor)
   ↓
Hook: Automatically scans project
   ↓
Result: DEBT-SWEEP-20260517_*.md report generated
   ↓
You: Open report, review findings, create GitHub issues
```

---

## Real-World Examples (What You'll Experience)

### Scenario 1: Editing a TypeScript File (Auto-Format)

**What you do**:
```typescript
// src/auth.ts (bad formatting)
function  login(  email  ,  password  )  {
  const user=authenticate(email,password)
}
```
Save the file (Ctrl+S / Cmd+S).

**What happens automatically**:
- Hook detects: `afterFileEdit` on `.ts` file
- Hook runs: `npx prettier --write src/auth.ts`
- File is formatted

**What you see**:
```
✓ Auto-formatted: src/auth.ts (Prettier)
```

**Result**: File is now clean. ✓

---

### Scenario 2: Trying to Delete Files (Dangerous Blocker)

**What you do**:
```bash
rm -rf src/old-tests/
```
Press Enter.

**What happens automatically**:
- Hook detects: `beforeShellExecution` with `rm -rf` pattern
- Hook analyzes: This is dangerous (outside `.cursor/`)
- Hook blocks: Command doesn't execute

**What you see**:
```
⚠️ RISKY: This command uses 'rm -rf' which is destructive. 
Please review before proceeding.
```

**Your choices**:
- Approve: "Yes, I'm sure" → command runs
- Abort: Don't run it
- Modify: Use `rm -i src/old-tests/*` (interactive)

**Result**: Data is protected. ✓

---

### Scenario 3: Sharing Code with Secret (Secret Detection)

**What you do**:
```
Write prompt: "My Razorpay key is RAZORPAY_KEY=pk_live_abc123. Why isn't it working?"
Click Send.
```

**What happens automatically**:
- Hook detects: `beforeSubmitPrompt` event
- Hook scans: Finds `RAZORPAY_KEY=pk_live_` pattern
- Hook warns: Secret detected!

**What you see**:
```
🔒 SECURITY WARNING: Potential secrets detected:
  • Possible API key or environment variable assignment

Do NOT submit if you want to keep secrets private!
```

**Your choices**:
- Fix: Remove secret: "My Razorpay key is configured. Why isn't it working?"
- Then send → No secret, goes through! ✓

**Result**: Secret is protected. ✓

---

### Scenario 4: End of Day (Tech Debt Sweep - If Installed)

**What you do**:
```
Close Cursor at end of day (or signal session end).
```

**What happens automatically** (if you installed user-level hooks):
- Hook detects: `stop` event
- Hook scans: Entire project
  - Linting violations: `npm run lint` + `ruff check`
  - Test coverage: `npm run test:ci`
  - Security: `npm audit` + `bandit`
  - TODOs: Grep for TODO/FIXME
- Report generated: `DEBT-SWEEP-20260517_173245.md`

**What you see**:
```
Tech debt sweep completed. Report: ./DEBT-SWEEP-20260517_173245.md
```

**You do** (next morning):
1. Open the report
2. Review findings (linting, test gaps, security issues, TODOs)
3. Create GitHub issues for findings
4. Plan fixes for next sprint

**Result**: Code health tracked automatically. ✓

---

## FAQ for New Users

**Q: Do I need to do anything to use these hooks?**
A: No. Project-level hooks are already active. Just use Cursor normally. Hooks run automatically.

**Q: Where do I see that a hook ran?**
A: In Cursor's context messages. When you save a file, you'll see "Auto-formatted: ..." in the chat.

**Q: Can I test a hook?**
A: Yes! Try this:
1. Create a messy TypeScript file
2. Save it
3. Watch it auto-format → See the confirmation message

**Q: What if a hook blocks something I need?**
A: The hook will ask for confirmation. You can approve it if you're sure it's safe.

**Q: Do hooks slow down my work?**
A: No. Project-level hooks are fast (< 1 second). User-level hooks run at session-end, so they don't interrupt.

**Q: Can I see when hooks fail?**
A: Yes. Go to Cursor Settings → Hooks tab. It shows all hook activity.

**Q: Do I need to memorize hook commands?**
A: No. Hooks are automatic. You don't run commands. They just work when triggered by events.

---

## Your First 3 Days

### Day 1: Project-Level Hooks (Automatic)
- ✓ Edit a TypeScript file, save it → See auto-format happen
- ✓ Try to run `rm -rf test/` → See dangerous blocker
- ✓ Add a secret to a prompt → See secret detection

### Day 2: Get Comfortable
- ✓ Use hooks naturally in your workflow
- ✓ They run automatically; you don't think about them
- ✓ Review `HOOKS-BY-EXAMPLE.md` if you want more details

### Day 3: Optional - Install Tech Debt Sweep
- ✓ Run setup commands (5 min)
- ✓ End of sprint, see report auto-generated
- ✓ Review findings and create GitHub issues

---

## Common Misconceptions

### ❌ "I need to run hooks manually"
✅ **No. Hooks run automatically based on events. You don't type anything.**

### ❌ "Hooks will interrupt my work"
✅ **No. They run in background. Project-level hooks are fast. User-level hooks run at session-end.**

### ❌ "I need to memorize what each hook does"
✅ **No. Just work normally. Hooks handle it automatically.**

### ❌ "Hooks are complicated"
✅ **No. They're simple: you do something → hook does its job → you see result.**

---

## Bottom Line

**Hooks are your invisible helpers.**

- Save a file → auto-formatted ✓
- Try something dangerous → blocked and warned ✓
- Accidentally add a secret → caught and warned ✓
- End of sprint → code health report generated ✓

**You don't need to remember anything. They just work.**

---

## Next Steps

1. ✅ Read this guide (done!)
2. ✅ Try editing a TS file and saving it (see auto-format)
3. ✅ Try a dangerous command (see it blocked)
4. ✅ Try adding a secret to a prompt (see warning)
5. ✅ (Optional) Install tech debt sweep at end of your sprint

That's all you need to do. Hooks handle the rest.

---

## Where to Go for More Info

- **Quick Reference**: `HOOKS-QUICK-REFERENCE.md`
- **Visual Flows**: `HOOKS-VISUAL-FLOWS.md`
- **Real-World Examples**: `HOOKS-BY-EXAMPLE.md`
- **Detailed Setup**: `HOOKS-SETUP.md`
- **Complete Summary**: `IMPLEMENTATION-SUMMARY.md`

**Start with this guide. Read the others when curious.**

---

**Welcome to Cursor Hooks! You've got this.** 🚀
