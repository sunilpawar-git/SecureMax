#!/bin/bash

# Hook: Tech Debt Sweep (End-of-Session Code Quality Audit)
# Event: stop (runs when Claude finishes a response)
# Purpose: Automated code health audit; surfaces debt before it compounds

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Initialize findings
linting_violations=()
dead_code_issues=()
test_gaps=()
security_issues=()
todos=()

# Determine project root (where package.json and ai-service exist)
project_root="."
if [[ -d ".git" ]]; then
  project_root="$(git rev-parse --show-toplevel)"
fi

# Output file for the report
report_file="$project_root/DEBT-SWEEP-$(date +%Y%m%d_%H%M%S).md"

echo -e "${BLUE}[Tech Debt Sweep]${NC} Starting end-of-session code quality audit..."
echo ""

# ============================================================================
# 1. LINTING VIOLATIONS (ESLint + ruff)
# ============================================================================

echo -e "${BLUE}[1/5]${NC} Scanning for linting violations..."

if [[ -f "$project_root/package.json" ]]; then
  if command -v npm &> /dev/null; then
    linting_output=$(cd "$project_root" && npm run lint 2>&1 | tail -20)
    if [[ $? -ne 0 ]]; then
      linting_violations+=("$linting_output")
    fi
  fi
fi

if [[ -d "$project_root/ai-service" ]] && command -v ruff &> /dev/null; then
  ruff_output=$(cd "$project_root/ai-service" && ruff check . 2>&1 | tail -20)
  if [[ $? -ne 0 ]]; then
    linting_violations+=("$ruff_output")
  fi
fi

if [[ ${#linting_violations[@]} -eq 0 ]]; then
  echo -e "  ${GREEN}✓${NC} No linting violations detected"
else
  echo -e "  ${RED}✗${NC} Linting violations found: ${#linting_violations[@]} issue(s)"
fi

# ============================================================================
# 2. DEAD CODE (Unused imports, etc.)
# ============================================================================

echo -e "${BLUE}[2/5]${NC} Scanning for dead code..."

# ESLint already detects unused imports via its rules
# Check if there are unused imports warnings in the last lint run
if [[ ${#linting_violations[@]} -gt 0 ]]; then
  unused_imports=$(echo "${linting_violations[@]}" | grep -c "unused\|Unused" || true)
  if [[ $unused_imports -gt 0 ]]; then
    dead_code_issues+=("Unused imports detected: $unused_imports instance(s)")
  fi
fi

# Grep for dead code patterns (commented-out code blocks)
commented_code=$(find "$project_root/src" "$project_root/ai-service" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.py" \) -exec grep -l "^\s*\/\/.*{$\|^\s*#.*:$" {} \; 2>/dev/null | wc -l)
if [[ $commented_code -gt 0 ]]; then
  dead_code_issues+=("Found $commented_code file(s) with potential commented-out code blocks")
fi

if [[ ${#dead_code_issues[@]} -eq 0 ]]; then
  echo -e "  ${GREEN}✓${NC} No obvious dead code detected"
else
  echo -e "  ${RED}✗${NC} Potential dead code found: ${#dead_code_issues[@]} issue(s)"
fi

# ============================================================================
# 3. TEST GAPS (Jest + pytest)
# ============================================================================

echo -e "${BLUE}[3/5]${NC} Checking test coverage and failures..."

jest_coverage=0
pytest_coverage=0
test_failures=0

if [[ -f "$project_root/package.json" ]] && command -v npm &> /dev/null; then
  jest_output=$(cd "$project_root" && npm run test:ci 2>&1 | tail -30)
  jest_failures=$(echo "$jest_output" | grep -c "FAIL\|failed\|error" || true)
  jest_coverage=$(echo "$jest_output" | grep -oP 'Statements\s*:\s*\K[0-9.]+' || echo "0")
  
  if [[ $jest_failures -gt 0 ]]; then
    test_failures=$((test_failures + jest_failures))
    test_gaps+=("Jest: $jest_failures test failures detected")
  fi
  
  if (( $(echo "$jest_coverage < 70" | bc -l 2>/dev/null || echo "1") )); then
    test_gaps+=("Jest: Coverage below 70% ($jest_coverage%)")
  fi
fi

if [[ -d "$project_root/ai-service" ]] && command -v pytest &> /dev/null; then
  pytest_output=$(cd "$project_root/ai-service" && pytest tests/ -m "not integration" 2>&1 | tail -20)
  pytest_failures=$(echo "$pytest_output" | grep -c "FAILED\|error\|failed" || true)
  
  if [[ $pytest_failures -gt 0 ]]; then
    test_failures=$((test_failures + pytest_failures))
    test_gaps+=("pytest: $pytest_failures test failures detected")
  fi
fi

if [[ ${#test_gaps[@]} -eq 0 ]]; then
  echo -e "  ${GREEN}✓${NC} Tests passing with good coverage"
else
  echo -e "  ${RED}✗${NC} Test issues found: ${#test_gaps[@]} issue(s)"
fi

# ============================================================================
# 4. SECURITY ISSUES (npm audit + Bandit)
# ============================================================================

echo -e "${BLUE}[4/5]${NC} Running security scans..."

npm_vulnerabilities=0
bandit_issues=0

if command -v npm &> /dev/null; then
  npm_output=$(npm audit --production 2>&1)
  npm_vulnerabilities=$(echo "$npm_output" | grep -oP '(?<=found )\d+' | head -1 || echo "0")
  if [[ $npm_vulnerabilities -gt 0 ]]; then
    security_issues+=("npm audit: $npm_vulnerabilities vulnerabilities found")
  fi
fi

if [[ -d "$project_root/ai-service" ]] && command -v bandit &> /dev/null; then
  bandit_output=$(cd "$project_root/ai-service" && bandit -r . -f json 2>&1 | jq '.metrics | "\(.total_issues) issues found"' 2>/dev/null || echo "0 issues")
  if [[ "$bandit_output" != "0 issues" ]]; then
    security_issues+=("Bandit: $bandit_output")
  fi
fi

if [[ ${#security_issues[@]} -eq 0 ]]; then
  echo -e "  ${GREEN}✓${NC} No critical security issues detected"
else
  echo -e "  ${YELLOW}⚠${NC} Security issues found: ${#security_issues[@]} issue(s)"
fi

# ============================================================================
# 5. TODO/FIXME COMMENTS
# ============================================================================

echo -e "${BLUE}[5/5]${NC} Scanning for TODO/FIXME comments..."

todo_count=$(find "$project_root/src" "$project_root/ai-service" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.py" \) -exec grep -h "TODO\|FIXME" {} + 2>/dev/null | wc -l)

if [[ $todo_count -gt 0 ]]; then
  todos+=("Found $todo_count TODO/FIXME comment(s) in codebase")
  echo -e "  ${YELLOW}⚠${NC} $todo_count TODO/FIXME comment(s) found"
else
  echo -e "  ${GREEN}✓${NC} No TODO/FIXME comments detected"
fi

# ============================================================================
# GENERATE REPORT
# ============================================================================

echo ""
echo -e "${BLUE}[Report]${NC} Generating debt sweep report..."
echo ""

cat > "$report_file" << EOF
# Security Crawler - Tech Debt Sweep Report

**Generated**: $(date '+%Y-%m-%d %H:%M:%S')

---

## Summary

| Category | Count | Severity |
|----------|-------|----------|
| Linting Violations | ${#linting_violations[@]} | $(if [[ ${#linting_violations[@]} -gt 0 ]]; then echo "🔴 High"; else echo "🟢 None"; fi) |
| Dead Code Issues | ${#dead_code_issues[@]} | $(if [[ ${#dead_code_issues[@]} -gt 0 ]]; then echo "🟡 Medium"; else echo "🟢 None"; fi) |
| Test Gaps | ${#test_gaps[@]} | $(if [[ ${#test_gaps[@]} -gt 0 ]]; then echo "🔴 High"; else echo "🟢 None"; fi) |
| Security Issues | ${#security_issues[@]} | $(if [[ ${#security_issues[@]} -gt 0 ]]; then echo "🔴 Critical"; else echo "🟢 None"; fi) |
| TODO/FIXME Comments | $todo_count | 🟡 Medium |

---

## Critical Issues 🔴

### Linting Violations (${#linting_violations[@]})

Priority: High  
Impact: Code consistency, maintainability, and potential runtime errors

EOF

if [[ ${#linting_violations[@]} -gt 0 ]]; then
  for issue in "${linting_violations[@]}"; do
    echo "- $(echo "$issue" | head -1)" >> "$report_file"
  done
else
  echo "✓ No linting violations detected" >> "$report_file"
fi

cat >> "$report_file" << EOF

**Action Items**:
- Run \`npm run lint\` and fix ESLint violations
- Run \`cd ai-service && ruff check .\` and fix Python linting issues
- Update code formatter config if rules have changed

---

### Security Issues (${#security_issues[@]})

Priority: Critical  
Impact: Vulnerability exposure, compliance risks

EOF

if [[ ${#security_issues[@]} -gt 0 ]]; then
  for issue in "${security_issues[@]}"; do
    echo "- $issue" >> "$report_file"
  done
else
  echo "✓ No security vulnerabilities detected" >> "$report_file"
fi

cat >> "$report_file" << EOF

**Action Items**:
- Run \`npm audit fix\` to patch JavaScript dependencies
- Review Bandit report and address findings
- Schedule security audit with team leads

---

### Test Gaps (${#test_gaps[@]})

Priority: High  
Impact: Risk of regressions, untested code paths

EOF

if [[ ${#test_gaps[@]} -gt 0 ]]; then
  for gap in "${test_gaps[@]}"; do
    echo "- $gap" >> "$report_file"
  done
else
  echo "✓ Tests passing with good coverage" >> "$report_file"
fi

cat >> "$report_file" << EOF

**Action Items**:
- Increase test coverage to > 75% (current: $jest_coverage%)
- Fix failing tests (resolve root cause, not just symptom)
- Add tests for new features in pull requests

---

## Medium Priority Issues 🟡

### Dead Code (${#dead_code_issues[@]})

Priority: Medium  
Impact: Code clutter, maintenance burden

EOF

if [[ ${#dead_code_issues[@]} -gt 0 ]]; then
  for issue in "${dead_code_issues[@]}"; do
    echo "- $issue" >> "$report_file"
  done
else
  echo "✓ No obvious dead code detected" >> "$report_file"
fi

cat >> "$report_file" << EOF

**Action Items**:
- Review unused imports and remove them
- Delete commented-out code blocks (version control preserves history)
- Add unused import detection to pre-commit hooks

---

### TODO/FIXME Comments ($todo_count)

Priority: Medium  
Impact: Technical debt accumulation, unclear intentions

EOF

if [[ $todo_count -gt 0 ]]; then
  echo "Found $todo_count comment(s) tagged TODO/FIXME:" >> "$report_file"
  find "$project_root/src" "$project_root/ai-service" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.py" \) -exec grep -H "TODO\|FIXME" {} + 2>/dev/null | head -20 >> "$report_file"
else
  echo "✓ No TODO/FIXME comments found" >> "$report_file"
fi

cat >> "$report_file" << EOF

**Action Items**:
- Convert TODOs to GitHub issues or sprint backlog items
- Assign owners and target dates
- Remove TODO comments once addressed

---

## Remediation Plan

### This Sprint 🎯

**Critical (Resolve ASAP)**:
1. Linting violations → 0 (run lint, fix all)
2. Security issues → 0 (npm audit fix, review Bandit findings)
3. Test failures → 0 (debug and fix)

**Medium**:
- Dead code cleanup (1-2 hours)
- Convert 50% of TODOs to tasks

### Next Sprint 📋

- Improve test coverage by 10-15%
- Eliminate remaining TODOs
- Set up pre-commit hooks to catch linting/formatting drift

### Ongoing 🔄

- Tech debt sweep every sprint (use this hook)
- Code reviews with focus on maintainability
- Security audit quarterly

---

## Notes

- This report was generated by the Tech Debt Sweep hook
- Archive sweep reports in a \`DEBT-SWEEPS/\` directory to track trends
- Compare reports sprint-to-sprint to measure codebase health
- Discuss findings in team retro; assign owners for action items

---

**Next Steps**: Review findings, prioritize issues, and create sprint tasks.

EOF

# Output summary
echo -e "${GREEN}✓${NC} Report generated: $report_file"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo "  Linting violations: ${#linting_violations[@]}"
echo "  Dead code issues: ${#dead_code_issues[@]}"
echo "  Test gaps: ${#test_gaps[@]}"
echo "  Security issues: ${#security_issues[@]}"
echo "  TODO/FIXME comments: $todo_count"
echo ""

# Return hook output (properly escaped JSON)
output=$(cat <<EOF
{
  "additional_context": "Tech debt sweep completed. Report: $report_file"
}
EOF
)
echo "$output"

exit 0
