#!/bin/bash

# Hook: Build Cache Inspector (Optional)
# Event: stop (runs when Claude finishes a response)
# Purpose: Warn about large cache artifacts; helps maintain local dev experience

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Determine project root
project_root="."
if [[ -d ".git" ]]; then
  project_root="$(git rev-parse --show-toplevel)"
fi

# Define size thresholds (in MB)
NODE_MODULES_THRESHOLD=500
NEXT_DIST_THRESHOLD=200
PYCACHE_THRESHOLD=100

issues=()

echo -e "${BLUE}[Cache Inspector]${NC} Checking cache sizes..."

# Check node_modules
if [[ -d "$project_root/node_modules" ]]; then
  size=$(du -sm "$project_root/node_modules" 2>/dev/null | cut -f1)
  if [[ $size -gt $NODE_MODULES_THRESHOLD ]]; then
    issues+=("node_modules: ${size}MB (threshold: ${NODE_MODULES_THRESHOLD}MB)")
    echo -e "  ${YELLOW}⚠${NC} node_modules exceeds threshold: ${size}MB"
  else
    echo -e "  ${GREEN}✓${NC} node_modules: ${size}MB"
  fi
fi

# Check .next
if [[ -d "$project_root/.next" ]]; then
  size=$(du -sm "$project_root/.next" 2>/dev/null | cut -f1)
  if [[ $size -gt $NEXT_DIST_THRESHOLD ]]; then
    issues+=(".next: ${size}MB (threshold: ${NEXT_DIST_THRESHOLD}MB)")
    echo -e "  ${YELLOW}⚠${NC} .next exceeds threshold: ${size}MB"
  else
    echo -e "  ${GREEN}✓${NC} .next: ${size}MB"
  fi
fi

# Check __pycache__
if [[ -d "$project_root/ai-service/__pycache__" ]]; then
  size=$(du -sm "$project_root/ai-service/__pycache__" 2>/dev/null | cut -f1)
  if [[ $size -gt $PYCACHE_THRESHOLD ]]; then
    issues+=("__pycache__: ${size}MB (threshold: ${PYCACHE_THRESHOLD}MB)")
    echo -e "  ${YELLOW}⚠${NC} __pycache__ exceeds threshold: ${size}MB"
  else
    echo -e "  ${GREEN}✓${NC} __pycache__: ${size}MB"
  fi
fi

# Generate context if issues found
if [[ ${#issues[@]} -gt 0 ]]; then
  context="Cache Inspector: ${#issues[@]} cache(s) above threshold. Consider running: npm ci (to reset node_modules), rm -rf .next (to clean build), or find ai-service -type d -name __pycache__ -exec rm -rf {} + (to clean Python cache)."
  echo ""
  echo -e "${YELLOW}Recommendations:${NC}"
  echo "  • Run \`npm ci\` instead of \`npm install\` to avoid bloat"
  echo "  • Clean .next: \`rm -rf .next && npm run build\`"
  echo "  • Clean Python cache: \`find ai-service -type d -name __pycache__ -exec rm -rf {} +\`"
else
  context="Cache Inspector: All cache sizes are healthy."
fi

echo ""
echo "{
  \"additional_context\": \"$context\"
}"

exit 0
