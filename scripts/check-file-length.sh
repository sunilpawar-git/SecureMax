#!/bin/bash

# File-length guard — enforces the <300-line rule on application source.
#
# Scope:
#   - src/**/*.{ts,tsx}          (excludes generated Prisma client)
#   - ai-service/**/*.py         (excludes tests/ and .venv/)
#
# Test files are exempt by convention (they grow with fixtures/cases).
# A small ALLOWLIST records pre-existing overages so the guard fails loud on
# any NEW violation (a ratchet) without forcing a same-PR refactor of legacy code.
#
# Exit 1 = a non-allowlisted file exceeds the limit.

set -euo pipefail

LIMIT=300
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Pre-existing overages (legacy, tracked in SECURITY-HARDENING.md). Do not grow.
ALLOWLIST=(
  "ai-service/routers/questionnaire.py"
)

is_allowlisted() {
  local f="$1"
  for a in "${ALLOWLIST[@]}"; do
    [[ "$f" == "$a" ]] && return 0
  done
  return 1
}

violations=0
allowlisted_hits=0

check_file() {
  local f="$1"
  local lines
  lines=$(wc -l < "$f" | tr -d ' ')
  if [[ "$lines" -gt "$LIMIT" ]]; then
    if is_allowlisted "$f"; then
      echo "  (allowlisted) $f — $lines lines"
      allowlisted_hits=$((allowlisted_hits + 1))
    else
      echo "  ✗ $f — $lines lines (limit $LIMIT)"
      violations=$((violations + 1))
    fi
  fi
}

echo "File-length guard (limit ${LIMIT} lines)"

while IFS= read -r f; do check_file "$f"; done < <(
  find src -type f \( -name '*.ts' -o -name '*.tsx' \) ! -path '*/generated/*'
)

while IFS= read -r f; do check_file "$f"; done < <(
  find ai-service -type f -name '*.py' ! -path '*/.venv/*' ! -path '*/tests/*' 2>/dev/null
)

echo "---"
if [[ "$violations" -gt 0 ]]; then
  echo "✗ $violations file(s) exceed ${LIMIT} lines. Split them before merging."
  exit 1
fi
echo "✓ No new file-length violations (${allowlisted_hits} allowlisted legacy file(s))."
