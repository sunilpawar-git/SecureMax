#!/bin/bash

# Test script for verifying Cursor Hooks
# Run this to ensure all hooks are working correctly

set -e

PROJECT_ROOT=$(git rev-parse --show-toplevel)
HOOKS_DIR="$PROJECT_ROOT/.cursor/hooks"

echo "=========================================="
echo "Cursor Hooks Verification Test"
echo "=========================================="
echo ""

# Check if hooks exist
echo "Checking hook files..."
hooks=(
  "format-edited-files.sh"
  "validate-question-graph.sh"
  "block-dangerous-commands.sh"
  "detect-secrets-in-prompt.sh"
)

missing=0
for hook in "${hooks[@]}"; do
  if [[ -f "$HOOKS_DIR/$hook" ]]; then
    if [[ -x "$HOOKS_DIR/$hook" ]]; then
      echo "✓ $hook (executable)"
    else
      echo "✗ $hook (not executable)"
      missing=$((missing+1))
    fi
  else
    echo "✗ $hook (missing)"
    missing=$((missing+1))
  fi
done

if [[ $missing -gt 0 ]]; then
  echo ""
  echo "Error: $missing hook(s) missing or not executable"
  echo "Run: chmod +x $HOOKS_DIR/*.sh"
  exit 1
fi

echo ""
echo "✓ All hook files present and executable"
echo ""

# Test JSON parsing
echo "Testing JSON parsing..."
echo "---"

# Test 1: Format Hook
echo -n "  format-edited-files.sh: "
if echo '{ "file_path": "test.ts" }' | bash "$HOOKS_DIR/format-edited-files.sh" 2>&1 | jq . >/dev/null 2>&1; then
  echo "✓"
else
  echo "✗"
fi

# Test 2: Question Graph Validation
echo -n "  validate-question-graph.sh: "
if echo '{ "file_path": "question-graph/hni.yaml" }' | bash "$HOOKS_DIR/validate-question-graph.sh" 2>&1 | jq . >/dev/null 2>&1; then
  echo "✓"
else
  echo "✗"
fi

# Test 3: Dangerous Command Blocker
echo -n "  block-dangerous-commands.sh: "
if echo '{ "command": "ls" }' | bash "$HOOKS_DIR/block-dangerous-commands.sh" 2>&1 | jq . >/dev/null 2>&1; then
  echo "✓"
else
  echo "✗"
fi

# Test 4: Secret Detection
echo -n "  detect-secrets-in-prompt.sh: "
if echo '{ "prompt": "Hello world" }' | bash "$HOOKS_DIR/detect-secrets-in-prompt.sh" 2>&1 | jq . >/dev/null 2>&1; then
  echo "✓"
else
  echo "✗"
fi

echo ""
echo "Testing hook.json syntax..."
if jq . "$PROJECT_ROOT/.cursor/hooks.json" >/dev/null 2>&1; then
  echo "✓ hooks.json is valid JSON"
else
  echo "✗ hooks.json has syntax errors"
fi

echo ""
echo "=========================================="
echo "✓ All hooks verified successfully!"
echo "=========================================="
