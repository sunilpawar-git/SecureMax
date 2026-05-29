#!/bin/bash
set -eo pipefail

echo ""
echo "🔍 Pre-commit checks running..."
echo "================================"
echo ""

# Next.js lint
echo "├─ ESLint (TypeScript/JavaScript)..."
npm run lint 2>&1 | tail -5 || {
  echo "  ❌ ESLint failed"
  exit 2
}
echo "  ✅ Passed"
echo ""

# Next.js type check
echo "├─ Type check (tsc)..."
npm run type-check 2>&1 | tail -3 || {
  echo "  ❌ Type check failed"
  exit 2
}
echo "  ✅ Passed"
echo ""

# Python lint
echo "├─ Python lint (ruff)..."
cd ai-service
if command -v ruff &>/dev/null; then
  ruff check . 2>&1 | tail -5 || {
    echo "  ❌ Ruff check failed"
    exit 2
  }
  echo "  ✅ Passed"
else
  echo "  ⚠️  Ruff not installed (non-blocking)"
fi
echo ""

# Python type check (optional, non-blocking for now)
echo "├─ Python type check (mypy)..."
if command -v mypy &>/dev/null; then
  if mypy . --ignore-missing-imports 2>&1 | tail -3; then
    echo "  ✅ Passed"
  else
    echo "  ⚠️  MyPy issues (non-blocking)"
  fi
else
  echo "  ⚠️  MyPy not installed (non-blocking)"
fi
cd ..
echo ""

echo "✅ All critical checks passed. Commit allowed."
echo ""
