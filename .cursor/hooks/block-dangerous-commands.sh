#!/bin/bash

# Hook: Block dangerous shell commands
# Event: beforeShellExecution
# Purpose: Prevent accidental data loss, enforce audit trail (Rule 15)

input=$(cat)

# Extract command from JSON stdin
command=$(echo "$input" | jq -r '.command // empty')

if [[ -z "$command" ]]; then
  echo '{ "permission": "allow" }'
  exit 0
fi

# Define dangerous patterns (case-insensitive)
command_lower=$(echo "$command" | tr '[:upper:]' '[:lower:]')

# Pattern 1: rm -rf (destructive filesystem operations)
# ONLY block if it's not in .cursor/ directory (allow setup operations)
if [[ "$command_lower" =~ rm[[:space:]]+-rf ]] && ! [[ "$command" =~ ".cursor" ]]; then
  echo "{
    \"permission\": \"ask\",
    \"user_message\": \"⚠️ RISKY: This command uses 'rm -rf' which is destructive. Please review before proceeding.\",
    \"agent_message\": \"Hook blocked 'rm -rf' command; user must approve.\"
  }"
  exit 0
fi

# Pattern 2: git push --force (bypasses safety)
if [[ "$command_lower" =~ git[[:space:]]+push.*--force ]]; then
  echo "{
    \"permission\": \"ask\",
    \"user_message\": \"⚠️ RISKY: 'git push --force' can overwrite remote history. Please review before proceeding.\",
    \"agent_message\": \"Hook blocked 'git push --force'; user must approve.\"
  }"
  exit 0
fi

# Pattern 3: Direct SQL mutations without WHERE clause or unsafe patterns
# Detect UPDATE/DELETE directly in shell command (not in files)
if [[ "$command_lower" =~ (UPDATE|DELETE)[[:space:]]+FROM[[:space:]]+ ]]; then
  # Check if it has WHERE clause
  if ! [[ "$command_lower" =~ WHERE[[:space:]]+ ]]; then
    echo "{
      \"permission\": \"ask\",
      \"user_message\": \"⚠️ RISKY: SQL UPDATE/DELETE detected without WHERE clause. This could affect multiple rows. Please review before proceeding.\",
      \"agent_message\": \"Hook blocked SQL mutation without WHERE; user must approve.\"
    }"
    exit 0
  fi
fi

# Pattern 4: Prisma operations on production
if [[ "$command_lower" =~ prisma[[:space:]]+(migrate|db[[:space:]]+push) ]] && [[ "$command" =~ NODE_ENV=production|DATABASE_URL.*prod ]]; then
  echo "{
    \"permission\": \"ask\",
    \"user_message\": \"⚠️ RISKY: Prisma operation detected with production environment. Please review before proceeding.\",
    \"agent_message\": \"Hook blocked production Prisma operation; user must approve.\"
  }"
  exit 0
fi

# Pattern 5: Direct database drops
if [[ "$command_lower" =~ (drop[[:space:]]+database|drop[[:space:]]+table) ]]; then
  echo "{
    \"permission\": \"ask\",
    \"user_message\": \"⚠️ RISKY: Database DROP command detected. This is destructive and cannot be undone. Please review carefully.\",
    \"agent_message\": \"Hook blocked DROP command; user must approve.\"
  }"
  exit 0
fi

# All other commands are allowed
echo '{ "permission": "allow" }'
exit 0
