# Cursor Hooks - Visual Flow Diagrams

This document shows the **flow of events** when hooks run, with visual diagrams.

---

## Diagram 1: Auto-Format Hook Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ YOU EDIT AND SAVE src/auth.ts                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Cursor detects: afterFileEdit event on .ts file                │
│ ✓ File path: src/auth.ts                                        │
│ ✓ Extension: .ts → matches "\.(ts|tsx|css|py)$"               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Hook triggers: format-edited-files.sh                           │
│ • Reads JSON from stdin: { "file_path": "src/auth.ts" }        │
│ • Detects file type: TypeScript                                │
│ • Decides formatter: use Prettier (not ruff)                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Hook executes: npx prettier --write src/auth.ts                │
│                                                                  │
│ BEFORE:                      │  AFTER:                          │
│ function login(email,pass){  │  function login(email, pass) {   │
│   const user=auth(e,p)       │    const user = auth(e, p);      │
│   if(user)return user        │    if (user) return user;        │
│ }                            │  }                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Hook returns to Cursor: JSON response                           │
│ {                                                               │
│   "additional_context": "Auto-formatted: src/auth.ts (Prettier)"
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ YOU SEE IN CURSOR                                               │
│ ✓ Context message: "Auto-formatted: src/auth.ts (Prettier)"   │
│ ✓ Your file is now clean and ready                            │
│                                                                 │
│ NO ACTION NEEDED FROM YOU                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Diagram 2: Dangerous Command Blocker Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ YOU TYPE IN CURSOR TERMINAL: rm -rf src/old-code/              │
│ YOU PRESS: Enter                                                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Cursor detects: beforeShellExecution event                     │
│ ✓ Command: "rm -rf src/old-code/"                              │
│ ✓ Matches dangerous pattern hook                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Hook triggers: block-dangerous-commands.sh                      │
│ • Reads JSON: { "command": "rm -rf src/old-code/" }           │
│ • Scans for patterns: "rm", "-rf"                              │
│ • Checks location: NOT in .cursor/ → RISKY!                   │
│ • Decision: ASK USER                                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Hook returns: REQUEST FOR PERMISSION                            │
│ {                                                               │
│   "permission": "ask",                                          │
│   "user_message": "⚠️ RISKY: rm -rf is destructive...",       │
│   "agent_message": "Hook blocked rm -rf; user must approve"    │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ YOU SEE:                                                         │
│ ⚠️ RISKY: This command uses 'rm -rf' which is destructive.    │
│ Please review before proceeding.                                │
│                                                                 │
│ COMMAND BLOCKED ❌ (does not execute)                           │
│                                                                 │
│ YOU HAVE OPTIONS:                                               │
│ 1. Approve: "Yes, I'm sure" → command runs                     │
│ 2. Abort: Type different command                               │
│ 3. Modify: Use safer version: "rm -i src/old-code/*"          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Diagram 3: Secret Detection Hook Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ YOU WRITE PROMPT WITH SECRET:                                   │
│ "My Razorpay key: RAZORPAY_KEY=pk_live_abc123"                │
│ YOU CLICK: Send Prompt                                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Cursor detects: beforeSubmitPrompt event                       │
│ ✓ Prompt text captured                                         │
│ ✓ About to send to Claude                                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Hook triggers: detect-secrets-in-prompt.sh                      │
│ • Reads prompt text                                             │
│ • Scans pattern: "RAZORPAY_KEY="                                │
│ • Finds: "pk_live_" (live API key indicator)                   │
│ • DECISION: WARN USER                                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Hook returns: WARNING MESSAGE                                    │
│ {                                                               │
│   "permission": "ask",                                          │
│   "user_message": "🔒 SECURITY WARNING: Possible API key...",  │
│   "agent_message": "Hook detected secret"                       │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ YOU SEE:                                                         │
│ 🔒 SECURITY WARNING: Potential secrets detected:               │
│   • Possible API key or environment variable assignment       │
│   • Possible Stripe API key format detected                   │
│                                                                 │
│ DO NOT submit if you want to keep secrets private!             │
│                                                                 │
│ PROMPT BLOCKED ❌ (not sent to Claude)                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ YOU HAVE OPTIONS:                                               │
│ 1. Remove secret: Edit prompt, remove "RAZORPAY_KEY=pk_live..."
│    Then click Send again ✓                                      │
│ 2. Proceed: Click "OK" to send anyway (not recommended)        │
│                                                                 │
│ SAFEST: Remove the secret first!                               │
│ "I have a Razorpay API key configured. Can you help..."       │
│ → Send ✓ (no secret)                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Diagram 4: YAML Validation Hook Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ YOU EDIT: question-graph/hni.yaml                               │
│ YOU SAVE THE FILE                                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Cursor detects: afterFileEdit on question-graph/*.yaml         │
│ ✓ File: question-graph/hni.yaml                                │
│ ✓ Matches: "question-graph/.*\.yaml$"                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Hook triggers: validate-question-graph.sh                       │
│ • Reads file path from JSON                                     │
│ • Checks if file exists ✓                                       │
│ • Finds validate.py ✓                                           │
│ • Runs: python question-graph/validate.py hni.yaml             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    ╭──────────────────╮
                    │ Validation Result │
                    ╰──────────────────╯
                    /                  \
        ✅ VALID              ❌ INVALID
          ↓                        ↓
    ┌──────────────────┐   ┌──────────────────────────────┐
    │ Hook returns:    │   │ Hook returns: ERROR MESSAGE  │
    │ {                │   │ {                            │
    │ "additional_..":│   │ "additional_context": "❌... │
    │ "✓ YAML valid" │   │ Error on line 5: Invalid ..."|
    │ }               │   │ }                            │
    └──────────────────┘   └──────────────────────────────┘
           ↓                         ↓
    ┌──────────────────┐   ┌──────────────────────────────┐
    │ YOU SEE:         │   │ YOU SEE:                     │
    │ ✓ YAML schema    │   │ ❌ YAML schema validation   │
    │   valid: ...yaml │   │ failed: ...yaml             │
    │                  │   │ Error: Invalid syntax on... │
    │ NO ERRORS ✓      │   │ Please review YAML...       │
    └──────────────────┘   │ FIX THE ERROR & SAVE AGAIN  │
                           └──────────────────────────────┘
```

---

## Diagram 5: Tech Debt Sweep Hook Flow (Session-End)

```
┌──────────────────────────────────────────────────────────────────┐
│ YOU'VE BEEN WORKING FOR 2 HOURS                                  │
│ MAKING VARIOUS CODE CHANGES                                      │
│                                                                   │
│ YOU CLOSE CURSOR OR END SESSION                                  │
└──────────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────────┐
│ Cursor detects: stop event (session complete)                  │
│ ✓ Triggers user-level hooks (if installed)                     │
└──────────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────────┐
│ Hook triggers: tech-debt-sweep.sh (runs in background)          │
│ • Does NOT interrupt you                                        │
│ • Scans the entire project                                      │
└──────────────────────────────────────────────────────────────────┘
                             ↓
                   ╭─────────────────────╮
                   │ Hook Scanning Phase │
                   ╰─────────────────────╯
                   /  /  /  /  /  \  \
                  /  /  /  /  /    \  \
           ┌────────────────────────────────────────┐
           │ 1. Linting check:                     │
           │    npm run lint                        │
           │    → Found: 2 ESLint violations       │
           │                                        │
           │ 2. Dead code check:                   │
           │    ESLint unused variables            │
           │    → Found: 0 issues                  │
           │                                        │
           │ 3. Test gap check:                    │
           │    npm run test:ci                     │
           │    → Coverage: 65% (target: 70%)      │
           │                                        │
           │ 4. Security scan:                     │
           │    npm audit --production              │
           │    → Found: 0 vulnerabilities         │
           │    bandit (Python)                    │
           │    → Found: 0 issues                  │
           │                                        │
           │ 5. TODO/FIXME scan:                   │
           │    grep for TODO and FIXME            │
           │    → Found: 3 comments                │
           └────────────────────────────────────────┘
                             ↓
         ┌────────────────────────────────────────────┐
         │ All scans complete                         │
         │ Aggregate findings by severity             │
         │ Create report file                         │
         └────────────────────────────────────────────┘
                             ↓
         ┌────────────────────────────────────────────┐
         │ Output file created:                       │
         │ DEBT-SWEEP-20260517_173245.md             │
         │                                            │
         │ Report contains:                           │
         │ • Summary table (linting, tests, security)│
         │ • Critical issues (ranked by severity)    │
         │ • Remediation plan (phase-wise)          │
         │ • Action items for this sprint            │
         └────────────────────────────────────────────┘
                             ↓
         ┌────────────────────────────────────────────┐
         │ YOU SEE IN CURSOR:                         │
         │ "Tech debt sweep completed.                │
         │  Report: ./DEBT-SWEEP-20260517_173245.md" │
         │                                            │
         │ YOU CAN:                                   │
         │ 1. Open the report                        │
         │ 2. Review findings                        │
         │ 3. Create GitHub issues                   │
         │ 4. Plan fixes for next sprint             │
         └────────────────────────────────────────────┘
```

---

## Diagram 6: Complete Daily Timeline with Hooks

```
MORNING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
09:00  ┌─ You start Cursor
       └─ Hooks load automatically (no setup)
       └─ Project-level hooks ACTIVE

MIDDAY - EDITING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10:30  ┌─ You edit src/components/Button.tsx
       └─ Auto-format hook TRIGGERS
           ✓ Prettier formats the file
           ✓ You see: "Auto-formatted: ..."

11:00  ┌─ You edit question-graph/hni.yaml
       └─ YAML validation hook TRIGGERS
           ✓ Python validates schema
           ✓ You see: "✓ YAML schema valid" or error

MIDDAY - DANGEROUS OPERATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12:00  ┌─ You type: rm -rf src/test/
       └─ Dangerous blocker hook TRIGGERS
           ✗ Command BLOCKED
           ✓ You see warning
           → You approve or change command

12:30  ┌─ You write prompt with API key
       └─ Secret detection hook TRIGGERS
           ✗ Prompt BLOCKED (not sent)
           ✓ You see security warning
           → You remove secret, send again

AFTERNOON - NORMAL WORK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14:00  ┌─ More edits, commands, prompts
       └─ Hooks run as needed (automatic)
           • Auto-format when you save files
           • Dangerous blocker when you run risky commands
           • Secret detection when you submit prompts

END OF DAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17:30  ┌─ You close Cursor or end session
       └─ Tech debt sweep hook TRIGGERS (if installed)
           → Scans entire project
           → Generates report: DEBT-SWEEP-*.md
           ✓ You see: "Tech debt sweep completed"
           → Next morning, you review report
           → Create GitHub issues for findings
```

---

## Quick Reference: What Each Hook Does

```
EVENT TYPE          HOOK                    WHAT HAPPENS
──────────────────────────────────────────────────────────────
File Save (TS/CSS)  Auto-Format             ✓ Auto-formats file
File Save (YAML)    YAML Validation         ✓ Validates schema
                    ✗ Warns if broken

Shell Command       Dangerous Blocker       ✗ Blocks rm -rf, etc.
                    ⚠️ Asks for approval

Prompt Submit       Secret Detection        ✗ Blocks if has secret
                    🔒 Warns about PII

Session End         Tech Debt Sweep         ✓ Generates report
                    📊 Lists all issues
```

---

## Summary

Hooks are **automatic workers** that run based on events:

| When | What Happens |
|------|-------------|
| **You save a file** | Auto-format or validation hook runs (transparent) |
| **You try a risky command** | Dangerous blocker asks for approval |
| **You submit a prompt with secret** | Secret detector warns you |
| **You end your session** | Tech debt sweep report generated |

**You never need to manually trigger anything. Hooks just work.**

---

See `HOOKS-BY-EXAMPLE.md` for detailed real-world scenarios with code examples.
