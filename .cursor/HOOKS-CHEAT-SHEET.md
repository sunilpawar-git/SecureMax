# Cursor Hooks - Cheat Sheet

**Print this page or keep it bookmarked while you learn hooks.**

---

## The Basics (One Page)

### What Are Hooks?
Automatic scripts that run at specific moments in your workflow.

### Do I Need to Activate Them?
**Project-level**: ✅ Already active (no setup)  
**User-level**: ❌ Optional (5-minute setup)

### How Do They Work?
```
You do something
    ↓
Cursor detects it
    ↓
Hook script runs automatically
    ↓
You see the result
```

---

## 4 Active Hooks Right Now

| Hook | Trigger | When | What You Do |
|------|---------|------|-----------|
| **Auto-Format** | Save `.ts`/`.tsx`/`.css`/`.py` | After edit | Save the file |
| **YAML Validate** | Save `question-graph/*.yaml` | After edit | Save the file |
| **Dangerous Blocker** | Run `rm -rf`, `git push --force`, etc. | Before command | Approve or change |
| **Secret Detection** | Submit prompt with secret | Before sending | Remove secret |

---

## What Happens in Each Scenario

### ✅ Scenario 1: Auto-Format
```
Step 1: You save src/auth.ts
Step 2: Hook runs Prettier automatically
Step 3: File is formatted
Step 4: You see: "Auto-formatted: src/auth.ts"
Result: Clean code ✓
```

### ⚠️ Scenario 2: Dangerous Blocker
```
Step 1: You type: rm -rf src/
Step 2: Hook detects the danger
Step 3: Command is BLOCKED
Step 4: You see warning
Result: Data protected ✓
```

### 🔒 Scenario 3: Secret Detection
```
Step 1: You write: "My key is RAZORPAY_KEY=pk_live_abc123"
Step 2: You click Send
Step 3: Hook detects secret
Step 4: Prompt is BLOCKED, warning shown
Result: Secret protected ✓
```

### 📊 Scenario 4: Tech Debt Sweep (User-Level, Optional)
```
Step 1: End of day, close Cursor
Step 2: Hook scans entire project
Step 3: Report generated: DEBT-SWEEP-*.md
Step 4: You see: "Tech debt sweep completed"
Result: Code health tracked ✓
```

---

## Quick Reference Table

```
╔════════════════════════════════════════════════════════════╗
║ HOOK NAME        │ WHEN IT RUNS    │ WHAT IT DOES        ║
╠════════════════════════════════════════════════════════════╣
║ Auto-Format      │ You save file   │ ✓ Formats code      ║
║ YAML Validate    │ You save YAML   │ ✓ Checks schema     ║
║ Danger Blocker   │ You run command │ ✗ Blocks risky ops  ║
║ Secret Detector  │ You send prompt │ ✗ Blocks if secret  ║
║ Tech Debt Sweep  │ Session ends    │ ✓ Generates report  ║
╚════════════════════════════════════════════════════════════╝
```

---

## Common Actions

### I Saved a TypeScript File
→ Auto-format hook runs automatically  
→ You see: "Auto-formatted: src/..."

### I Want to Run `rm -rf`
→ Dangerous blocker hook stops it  
→ You see warning  
→ Approve or change command

### I Have an API Key to Share
→ Remove it before pasting in prompt  
→ Secret detector will catch it otherwise

### It's End of Sprint
→ (Optional) Install user-level tech debt sweep  
→ Hook generates report automatically

### I See "Hook Failed"
→ No problem, hooks fail gracefully  
→ Try again or continue working

---

## How to Know A Hook Ran

You'll see messages in Cursor like:
- ✅ "Auto-formatted: src/auth.ts (Prettier)"
- ⚠️ "RISKY: This command uses 'rm -rf'..."
- 🔒 "SECURITY WARNING: Possible API key detected"
- 📊 "Tech debt sweep completed. Report: ./DEBT-SWEEP-*.md"

---

## If a Hook Blocks Something

### Auto-Format Failed?
→ File didn't format  
→ Try again on next save, or format manually

### YAML Validation Failed?
→ Schema error shown  
→ Fix the YAML and save again

### Dangerous Command Blocked?
→ You see warning  
→ Type YES to approve, or use safer command

### Secret Detected?
→ Prompt not sent  
→ Remove secret and resubmit

---

## Need Help?

**Quick Questions**: See this cheat sheet  
**Real Examples**: `HOOKS-BY-EXAMPLE.md`  
**Visual Flows**: `HOOKS-VISUAL-FLOWS.md`  
**Detailed Guide**: `HOOKS-SETUP.md`  
**Quick Start**: `HOOKS-QUICK-START.md`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Hook didn't run | Restart Cursor |
| Hook is too slow | Check project size; report takes time |
| I see error | Hooks fail gracefully; continue working |
| I don't see confirmation | Check Cursor's Hooks tab in settings |

---

## TL;DR

- ✅ Project hooks are active (no setup)
- ✅ They run automatically (no commands)
- ✅ They're helpful, not annoying
- ✅ You see results in Cursor's context
- 📚 More details in other guides when curious

**That's it. Start coding. Hooks handle the rest.** 🚀

