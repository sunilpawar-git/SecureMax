#!/usr/bin/env bash

# Hook: Block dangerous shell commands
# Event: beforeShellExecution
# Purpose: Prevent accidental data loss, enforce audit trail (Rule 15)
# Safe fallback: always outputs valid JSON; fails open on any parse error

set -uo pipefail

ALLOW='{ "permission": "allow" }'

# Read stdin (Cursor sends JSON: {"command": "...", ...})
input=$(cat 2>/dev/null || true)

# Pure-bash JSON extraction — no jq dependency
# Extracts the value of "command" field from the JSON object
if [[ -z "$input" ]]; then
  echo "$ALLOW"
  exit 0
fi

# Extract command value using parameter expansion / sed (no external deps)
command_val=$(echo "$input" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)

if [[ -z "$command_val" ]]; then
  echo "$ALLOW"
  exit 0
fi

command_lower=$(echo "$command_val" | tr '[:upper:]' '[:lower:]')

# Pattern 1: rm -rf (destructive filesystem operations)
if [[ "$command_lower" =~ rm[[:space:]]+-rf ]] && ! [[ "$command_val" =~ ".cursor" ]]; then
  echo '{
    "permission": "ask",
    "user_message": "RISKY: This command uses rm -rf which is destructive. Please review before proceeding.",
    "agent_message": "Hook blocked rm -rf command; user must approve."
  }'
  exit 0
fi

# Pattern 2: git push --force (bypasses safety)
if [[ "$command_lower" =~ git[[:space:]]+push.*--force ]]; then
  echo '{
    "permission": "ask",
    "user_message": "RISKY: git push --force can overwrite remote history. Please review before proceeding.",
    "agent_message": "Hook blocked git push --force; user must approve."
  }'
  exit 0
fi

# Pattern 3: SQL mutations without WHERE clause
if [[ "$command_lower" =~ (update|delete)[[:space:]]+from[[:space:]]+ ]]; then
  if ! [[ "$command_lower" =~ where[[:space:]]+ ]]; then
    echo '{
      "permission": "ask",
      "user_message": "RISKY: SQL UPDATE/DELETE detected without WHERE clause. This could affect multiple rows.",
      "agent_message": "Hook blocked SQL mutation without WHERE; user must approve."
    }'
    exit 0
  fi
fi

# Pattern 4: Prisma operations on production
if [[ "$command_lower" =~ prisma[[:space:]]+(migrate|db[[:space:]]+push) ]] && [[ "$command_val" =~ NODE_ENV=production|DATABASE_URL.*prod ]]; then
  echo '{
    "permission": "ask",
    "user_message": "RISKY: Prisma operation detected with production environment. Please review before proceeding.",
    "agent_message": "Hook blocked production Prisma operation; user must approve."
  }'
  exit 0
fi

# Pattern 5: Direct database drops
if [[ "$command_lower" =~ (drop[[:space:]]+database|drop[[:space:]]+table) ]]; then
  echo '{
    "permission": "ask",
    "user_message": "RISKY: Database DROP command detected. This is destructive and cannot be undone.",
    "agent_message": "Hook blocked DROP command; user must approve."
  }'
  exit 0
fi

echo "$ALLOW"
exit 0
