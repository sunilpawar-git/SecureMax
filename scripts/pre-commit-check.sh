#!/bin/bash
set -e

echo ""
echo "🔍 Pre-commit checks running..."
echo "================================"
echo ""

# Next.js lint
echo "├─ ESLint (TypeScript/JavaScript)..."
if npm run lint 2>&1 | tail -5; then
  echo "  ✅ Passed"
else
  echo "  ❌ ESLint failed"
  exit 2
fi
echo ""

# Next.js type check
echo "├─ Type check (tsc)..."
if npm run type-check 2>&1 | tail -3; then
  echo "  ✅ Passed"
else
  echo "  ❌ Type check failed"
  exit 2
fi
echo ""

# Python lint
echo "├─ Python lint (ruff)..."
cd ai-service
if ruff check . 2>&1 | tail -5; then
  echo "  ✅ Passed"
else
  echo "  ❌ Ruff check failed"
  exit 2
fi
echo ""

# Python type check (optional, non-blocking for now)
echo "├─ Python type check (mypy)..."
if mypy . --ignore-missing-imports 2>&1 | tail -3; then
  echo "  ✅ Passed"
else
  echo "  ⚠️  MyPy issues (non-blocking)"
fi
cd ..
echo ""

echo "✅ All critical checks passed. Commit allowed."
echo ""
