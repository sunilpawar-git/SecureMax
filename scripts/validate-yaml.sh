#!/bin/bash

# Question Graph YAML Validation Hook
# Validates question-graph/*.yaml files for:
# - Syntax errors
# - Orphan nodes
# - Dead ends (nodes with no outgoing edges)
# - Missing node references
# - Terminal reachability
# - CPP domain validity

set -e

echo "📋 Validating question graph YAML..."
echo ""

# Check if any YAML files were modified
YAML_FILES=$(git diff --cached --name-only | grep -E 'question-graph/.*\.yaml$' || true)

if [ -z "$YAML_FILES" ]; then
  echo "✅ No question graph YAML files in this commit"
  exit 0
fi

echo "Files being committed:"
for f in $YAML_FILES; do
  echo "  - $f"
done
echo ""

# Run the validation script (which checks all YAML files in question-graph/)
cd "$(git rev-parse --show-toplevel)" || exit 1

if python question-graph/validate.py; then
  echo ""
  echo "✅ Question graph validation passed"
  exit 0
else
  echo ""
  echo "❌ Question graph validation failed"
  echo ""
  echo "Fix the YAML errors above and try again:"
  echo "  python question-graph/validate.py"
  exit 2
fi
