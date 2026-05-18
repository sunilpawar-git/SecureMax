#!/bin/bash

# Tech Debt Audit Report (run at end of sprint)
# Usage: bash scripts/tech-debt-audit.sh > SPRINT_AUDIT.md

echo "# Tech Debt Audit Report"
echo ""
echo "**Generated**: $(date '+%Y-%m-%d %H:%M:%S')"
echo "**Branch**: $(git rev-parse --abbrev-ref HEAD)"
echo ""
echo "---"
echo ""

# ============================================================================
# 1. ESLint Violations
# ============================================================================
echo "## 1. Code Quality — TypeScript/JavaScript (ESLint)"
echo ""
if npm run lint 2>&1 | grep -i error; then
  echo ""
else
  echo "✅ No ESLint errors found"
  echo ""
fi

# ============================================================================
# 2. Type Errors
# ============================================================================
echo "## 2. Type Safety — TypeScript (tsc)"
echo ""
if npm run type-check 2>&1 | grep -i error; then
  echo ""
else
  echo "✅ No type errors found"
  echo ""
fi

# ============================================================================
# 3. Python Violations
# ============================================================================
echo "## 3. Code Quality — Python (ruff)"
echo ""
cd ai-service
if ruff check . 2>&1 | head -30; then
  echo ""
else
  echo "✅ No Python lint issues found"
  echo ""
fi
cd ..

# ============================================================================
# 4. Test Coverage
# ============================================================================
echo "## 4. Test Coverage"
echo ""
echo "### Next.js Tests"
npm run test:ci 2>&1 | grep -E "TOTAL|Tests:|Statements:" || echo "ℹ️  Run: npm run test:ci (from project root)"
echo ""

echo "### FastAPI Tests"
cd ai-service
pytest --tb=no -q 2>&1 | tail -5 || echo "ℹ️  Run: pytest (from ai-service/)"
cd ..
echo ""

# ============================================================================
# 5. Code Churn — Recently Changed Files
# ============================================================================
echo "## 5. Code Hotspots (files changed most in last 2 weeks)"
echo ""
echo '```'
git log --since="2 weeks ago" --name-only --pretty=format: | sort | uniq -c | sort -rn | head -15
echo '```'
echo ""

# ============================================================================
# 6. Commit Activity
# ============================================================================
echo "## 6. Recent Commits (last 2 weeks)"
echo ""
echo '```'
git log --oneline --since="2 weeks ago" | head -20
echo '```'
echo ""

# ============================================================================
# 7. Dead Code Detection (heuristic)
# ============================================================================
echo "## 7. Potential Dead Code (unused exports — heuristic)"
echo ""
echo "### Unused TypeScript exports"
UNUSED=$(grep -r "^export " src/ 2>/dev/null | grep -v "interface\|type\|enum" | wc -l)
echo "Found ~$UNUSED export statements in src/. Review for unused functions/classes."
echo ""

echo "### Python unused imports"
cd ai-service
UNUSED_PY=$(grep -r "^import\|^from" . --include="*.py" 2>/dev/null | wc -l)
echo "Found ~$UNUSED_PY import statements. Consider running: ruff check --select=F401"
cd ..
echo ""

# ============================================================================
# 8. Dependency Audit
# ============================================================================
echo "## 8. Dependency Health"
echo ""
echo "### Node.js Dependencies"
npm audit 2>&1 | grep -E "vulnerabilities|packages|audited" || echo "ℹ️  Run: npm audit"
echo ""

echo "### Python Dependencies"
cd ai-service
pip audit --desc 2>&1 | head -10 || echo "ℹ️  Run: pip audit (if installed)"
cd ..
echo ""

# ============================================================================
# 9. Security Issues
# ============================================================================
echo "## 9. Security Scan (secrets check)"
echo ""
if command -v git-secrets &> /dev/null; then
  git secrets --scan || echo "✅ No secrets found"
else
  echo "ℹ️  git-secrets not installed. Install: brew install git-secrets"
fi
echo ""

# ============================================================================
# Summary & Action Items
# ============================================================================
echo "## 10. Action Items"
echo ""
echo "### Phase 1 (This Sprint): Critical Fixes"
echo "- [ ] Review section 1-3 above; fix all ESLint/type errors"
echo "- [ ] Review section 4; ensure test coverage > 70%"
echo ""

echo "### Phase 2 (Next Sprint): Code Quality"
echo "- [ ] Review section 5; refactor top 3 hotspots"
echo "- [ ] Review section 7; remove dead code"
echo ""

echo "### Phase 3 (Later): Maintenance"
echo "- [ ] Review section 8; update vulnerable dependencies"
echo "- [ ] Review section 9; ensure secrets policy enforced"
echo ""

echo "---"
echo ""
echo "📌 **Tip**: Save this report to SPRINT_AUDIT.md and track it in your project wiki."
echo ""
