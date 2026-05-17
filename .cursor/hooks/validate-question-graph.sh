#!/bin/bash

# Hook: Validate question-graph YAML schema after edits
# Event: afterFileEdit (triggered on question-graph/*.yaml)
# Purpose: Catch schema breaks immediately; prevent broken graph from seeding into DB

input=$(cat)

# Extract file path from JSON stdin
file_path=$(echo "$input" | jq -r '.file_path // empty')

if [[ -z "$file_path" ]]; then
  echo '{ "additional_context": "No file path detected; skipping YAML validation." }'
  exit 0
fi

# Only process YAML files in question-graph directory
if [[ ! "$file_path" =~ question-graph/.*\.yaml$ ]]; then
  echo '{ "additional_context": "Not a question-graph YAML file; skipping validation." }'
  exit 0
fi

# Check if the file exists before validation
if [[ ! -f "$file_path" ]]; then
  echo '{ "additional_context": "File does not exist yet; will validate on next save." }'
  exit 0
fi

# Check if validate.py exists
if [[ ! -f "question-graph/validate.py" ]]; then
  echo "{
    \"additional_context\": \"Warning: question-graph/validate.py not found. Cannot validate $file_path.\"
  }"
  exit 0
fi

# Run validation script
if command -v python3 &> /dev/null; then
  output=$(python3 question-graph/validate.py "$file_path" 2>&1)
  exit_code=$?
  
  if [[ $exit_code -eq 0 ]]; then
    output_json=$(jq -n --arg msg "✓ YAML schema valid: $file_path" '{additional_context: $msg}')
    echo "$output_json"
    exit 0
  else
    # Return validation error message using jq for proper escaping
    error_msg=$(echo "$output" | head -20 | sed 's/"/\\"/g')
    output_json=$(jq -n --arg msg "❌ YAML schema validation failed: $file_path\n\n$error_msg\n\nPlease review the YAML structure." '{additional_context: $msg}')
    echo "$output_json"
    exit 0
  fi
else
  echo "{
    \"additional_context\": \"python3 not found; cannot validate YAML schema.\"
  }"
  exit 0
fi
