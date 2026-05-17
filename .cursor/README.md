# Cursor Hooks System for Security Crawler

Welcome! This folder contains everything you need to understand and use Cursor hooks.

---

## 🎯 Start Here (Pick Your Learning Style)

### ⚡ I'm in a Hurry (5 minutes)
→ Read: [`HOOKS-CHEAT-SHEET.md`](HOOKS-CHEAT-SHEET.md)
- One-page overview
- Quick reference tables
- Common scenarios

### 📚 I'm New to Hooks (15 minutes)
→ Read: [`HOOKS-QUICK-START.md`](HOOKS-QUICK-START.md)
- Easy-to-understand guide
- Real-world examples
- FAQ for beginners

### 🎓 I Want to Learn Everything (30 minutes)
→ Read in order:
1. [`HOOKS-QUICK-START.md`](HOOKS-QUICK-START.md) - The basics
2. [`HOOKS-BY-EXAMPLE.md`](HOOKS-BY-EXAMPLE.md) - Real scenarios with code
3. [`HOOKS-VISUAL-FLOWS.md`](HOOKS-VISUAL-FLOWS.md) - Diagrams and flows

### 🔧 I Need Setup Help (20 minutes)
→ Read: [`HOOKS-SETUP.md`](HOOKS-SETUP.md)
- Detailed installation guide
- Troubleshooting section
- Advanced customization

### 📋 I Want the Complete Reference
→ Read: [`IMPLEMENTATION-SUMMARY.md`](IMPLEMENTATION-SUMMARY.md)
- Full project breakdown
- Architecture details
- Expected impact and benefits

---

## 📂 What's in This Folder

```
.cursor/
├── README.md (YOU ARE HERE)
├── HOOKS-CHEAT-SHEET.md          ← One-page quick ref
├── HOOKS-QUICK-START.md          ← Beginner guide
├── HOOKS-BY-EXAMPLE.md           ← Real scenarios
├── HOOKS-VISUAL-FLOWS.md         ← Diagrams
├── HOOKS-QUICK-REFERENCE.md      ← Complete reference
├── HOOKS-SETUP.md                ← Installation guide
├── IMPLEMENTATION-SUMMARY.md     ← Project summary
├── test-hooks.sh                 ← Verification script
│
├── hooks/ (ACTIVE NOW)
│   ├── hooks.json                ← Main configuration
│   ├── format-edited-files.sh    ← Auto-format hook
│   ├── validate-question-graph.sh ← YAML validator
│   ├── block-dangerous-commands.sh ← Safety gate
│   └── detect-secrets-in-prompt.sh ← Secret scanner
│
└── user-hooks/ (Optional setup)
    ├── tech-debt-sweep.sh        ← Tech debt automation
    └── cache-check.sh            ← Cache monitor
```

---

## ✅ What Are Hooks?

Hooks are **automatic scripts** that run at specific moments in your workflow.

You don't manually trigger them. They just happen.

```
Example:
You save a file → Hook auto-formats it → You see confirmation
```

---

## 🚀 The 4 Active Hooks (Already Running)

| # | Hook | When | What It Does |
|---|------|------|-------------|
| 1 | **Auto-Format** | You save `.ts`, `.css`, `.py` file | Auto-formats with Prettier/ruff |
| 2 | **YAML Validate** | You save `question-graph/*.yaml` | Validates YAML schema |
| 3 | **Dangerous Blocker** | You try `rm -rf`, `git push --force` | Blocks risky commands |
| 4 | **Secret Detection** | You submit prompt with secret | Blocks and warns |

**Status**: ✅ All active right now. No setup needed.

---

## 🔄 How They Work (The Mechanism)

```
You do something (edit, command, prompt)
           ↓
Cursor detects the event
           ↓
Hook script runs automatically (you don't type anything)
           ↓
Hook does its job (format, validate, block, etc.)
           ↓
You see result in Cursor's context
```

---

## 📖 Quick Examples

### Example 1: Auto-Format
```
You save: src/auth.ts (badly formatted)
           ↓
Hook sees: afterFileEdit on .ts file
           ↓
Hook runs: npx prettier --write src/auth.ts
           ↓
You see: "✓ Auto-formatted: src/auth.ts"
```

### Example 2: Dangerous Blocker
```
You type: rm -rf src/test/
          ↓
Hook sees: beforeShellExecution with rm -rf
          ↓
Hook blocks: ✗ Command blocked
             ⚠️ "RISKY: rm -rf is destructive"
          ↓
You decide: Approve or use safer command
```

### Example 3: Secret Detection
```
You write: "My key is RAZORPAY_KEY=pk_live_abc"
           ↓
Hook sees: beforeSubmitPrompt
           ↓
Hook detects: API key pattern found!
             ✗ Prompt blocked
             🔒 "SECURITY WARNING: Secret detected"
           ↓
You remove: secret and resubmit
```

### Example 4: Tech Debt Sweep (Optional)
```
You close Cursor (end of day)
       ↓
Hook sees: stop event
           ↓
Hook scans: ESLint, tests, security, TODOs
           ↓
Hook generates: DEBT-SWEEP-20260517_*.md report
              ✓ "Tech debt sweep completed"
           ↓
You review: Report and create GitHub issues
```

---

## 🎯 Do I Need to Do Anything?

### Project-Level Hooks
**Answer**: ✅ **NO** - Already active. Nothing to setup.

Just use Cursor normally. Hooks run automatically.

### User-Level Tech Debt Sweep (Optional)
**Answer**: Optional 5-minute setup

See [`HOOKS-SETUP.md`](HOOKS-SETUP.md) for instructions.

---

## ❓ Common Questions

**Q: Do I need to manually trigger hooks?**
A: No. They're automatic. They trigger based on events.

**Q: Will hooks interrupt my work?**
A: No. Project-level hooks are fast. User-level hooks run at session-end.

**Q: What if a hook blocks something I need?**
A: The hook asks for approval. You can confirm if you're sure.

**Q: Where do I see that a hook ran?**
A: In Cursor's context messages. You'll see confirmations like "✓ Auto-formatted..."

**Q: Do hooks run in CI/CD?**
A: No. They're local developer tools. CI has its own checks.

**Q: Can I customize hooks?**
A: Yes. All scripts are editable bash files.

---

## 📚 Learning Path

### Day 1: Get Familiar
- [ ] Read: [`HOOKS-CHEAT-SHEET.md`](HOOKS-CHEAT-SHEET.md) (5 min)
- [ ] Try: Edit a TS file and save it (see auto-format)
- [ ] Try: Type `rm -rf test/` (see dangerous blocker)
- [ ] Try: Add a secret to a prompt (see detection)

### Day 2: Understand the Flows
- [ ] Read: [`HOOKS-BY-EXAMPLE.md`](HOOKS-BY-EXAMPLE.md) (15 min)
- [ ] Read: [`HOOKS-VISUAL-FLOWS.md`](HOOKS-VISUAL-FLOWS.md) (10 min)
- [ ] Feel comfortable with how hooks work

### Day 3+: Use Naturally
- [ ] Hooks run automatically; you don't think about them
- [ ] (Optional) Install tech debt sweep for sprint-end reports
- [ ] Review other documentation as needed

---

## 🔍 Documentation Map

```
Quick Learners:
HOOKS-CHEAT-SHEET.md ← Start here
    ↓
HOOKS-QUICK-START.md ← Then here

Visual Learners:
HOOKS-BY-EXAMPLE.md ← Real scenarios with code
HOOKS-VISUAL-FLOWS.md ← Diagrams and flows

Detail-Oriented:
HOOKS-SETUP.md ← Installation and setup
IMPLEMENTATION-SUMMARY.md ← Complete reference
HOOKS-QUICK-REFERENCE.md ← Full details

Test It:
test-hooks.sh ← Verify everything works
```

---

## ✨ Key Insight

**Hooks are your invisible helpers.**

You don't need to remember to format code, validate YAML, or check for secrets. Hooks handle it automatically.

The only thing you need to know: **Hooks run on their own. You don't need to do anything special.**

---

## 🚀 Next Steps

1. ✅ Read [`HOOKS-CHEAT-SHEET.md`](HOOKS-CHEAT-SHEET.md) (5 min)
2. ✅ Try using hooks naturally in your workflow
3. ✅ Reference other docs when curious or stuck
4. ✅ (Optional) Install user-level hooks at sprint-end

That's it. Start coding. Hooks handle the rest.

---

## 📞 Need Help?

- **Quick question?** → [`HOOKS-CHEAT-SHEET.md`](HOOKS-CHEAT-SHEET.md)
- **How do they work?** → [`HOOKS-BY-EXAMPLE.md`](HOOKS-BY-EXAMPLE.md)
- **Setup issues?** → [`HOOKS-SETUP.md`](HOOKS-SETUP.md)
- **Verify everything works?** → `bash .cursor/test-hooks.sh`

---

## 📝 Summary

| Item | Status |
|------|--------|
| Project-level hooks | ✅ Active (4 hooks) |
| User-level hooks | ⏳ Optional setup |
| Documentation | ✅ Complete (8 guides) |
| Verification | ✅ Test script included |
| Your action needed | ✅ Just read and use! |

**You're all set. Enjoy deterministic QA!** 🎉

---

**Last updated**: May 17, 2026  
**All files**: Production-ready and tested
