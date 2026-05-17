#!/bin/bash

# Hook: Auto-format edited files (Prettier for TS/CSS, ruff for Python)
# Event: afterFileEdit
# Purpose: Eliminate formatting drift; enforce consistent code style

input=$(cat)

# Extract file path from JSON stdin
file_path=$(echo "$input" | jq -r '.file_path // empty')

if [[ -z "$file_path" ]]; then
  echo '{ "additional_context": "No file path detected; skipping format hook." }'
  exit 0
fi

# Determine file type and format accordingly
case "$file_path" in
  *.ts | *.tsx | *.css)
    # Format TypeScript/CSS with Prettier
    if command -v npx &> /dev/null; then
      if npx prettier --write "$file_path" 2>/dev/null; then
        echo "{
          \"additional_context\": \"Auto-formatted: $file_path (Prettier)\"
        }"
        exit 0
      else
        echo "{
          \"additional_context\": \"Warning: Prettier failed on $file_path. Review manually.\"
        }"
        exit 0
      fi
    else
      echo "{
        \"additional_context\": \"npx not found; cannot format $file_path\"
      }"
      exit 0
    fi
    ;;
  *.py)
    # Format Python with ruff
    if command -v ruff &> /dev/null; then
      if ruff format "$file_path" 2>/dev/null; then
        echo "{
          \"additional_context\": \"Auto-formatted: $file_path (ruff format)\"
        }"
        exit 0
      else
        echo "{
          \"additional_context\": \"Warning: ruff format failed on $file_path. Review manually.\"
        }"
        exit 0
      fi
    else
      echo "{
        \"additional_context\": \"ruff not found; cannot format $file_path\"
      }"
      exit 0
    fi
    ;;
  *)
    echo "{
      \"additional_context\": \"File type not recognized for formatting: $file_path\"
    }"
    exit 0
    ;;
esac
