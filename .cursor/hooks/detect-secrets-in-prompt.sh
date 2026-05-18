#!/bin/bash

# Hook: Detect secrets and PII in prompts before submission
# Event: beforeSubmitPrompt
# Purpose: Prevent accidental secret leakage; enforce Rule 14 (Security by Design)

input=$(cat)

# Extract prompt text from JSON stdin
prompt=$(echo "$input" | jq -r '.prompt // empty')

if [[ -z "$prompt" ]]; then
  echo '{ "permission": "allow" }'
  exit 0
fi

# Array to store detected secrets
detected=()

# Pattern 1: API key environment variable assignments (RAZORPAY_KEY=, GOOGLE_CLIENT_SECRET=, etc.)
if echo "$prompt" | grep -qiE '(RAZORPAY_KEY|GOOGLE_CLIENT_SECRET|NEXT_PUBLIC_API|DATABASE_URL|AUTH_SECRET|API_KEY)\s*=\s*[A-Za-z0-9_\-\.]+'; then
  detected+=("Possible API key or environment variable assignment")
fi

# Pattern 2: Common key format patterns (sk_live_, pk_live_, ak_, etc.)
if echo "$prompt" | grep -qE '(sk_live_|pk_live_|rk_live_|ak_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})'; then
  detected+=("Possible AWS or Stripe API key format detected")
fi

# Pattern 3: Bearer tokens
if echo "$prompt" | grep -qiE 'Bearer\s+[A-Za-z0-9_\-\.]+'; then
  detected+=("Possible Bearer token detected")
fi

# Pattern 4: Common JWT pattern (three base64-like segments separated by dots)
if echo "$prompt" | grep -qE '[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+' && echo "$prompt" | grep -qE 'Bearer|token|jwt|auth'; then
  detected+=("Possible JWT or authentication token detected")
fi

# Pattern 5: Email addresses (basic check; if followed by a password or key, it's suspicious)
if echo "$prompt" | grep -qiE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|org|net|co|in)' && echo "$prompt" | grep -qiE '(password|pass|pwd|secret|token|key)\s*[:=]'; then
  detected+=("Possible PII (email with password/key) detected")
fi

# Pattern 6: Firebase API keys and credentials
if echo "$prompt" | grep -qiE '(FIREBASE_|firebase_|AIzaSy[A-Za-z0-9_-]+)'; then
  detected+=("Possible Firebase credentials detected")
fi

# Pattern 7: Private key formats (basic check for PEM/RSA headers)
if echo "$prompt" | grep -q "BEGIN.*KEY"; then
  detected+=("Possible private cryptographic key detected")
fi

# Pattern 8: Hardcoded URLs with credentials (e.g., postgres://user:pass@host)
if echo "$prompt" | grep -qE '[a-z]+://[a-zA-Z0-9_]+:[a-zA-Z0-9_!@#$%^&*]+@'; then
  detected+=("Possible database connection string with credentials detected")
fi

# If any secrets detected, warn the user
if [[ ${#detected[@]} -gt 0 ]]; then
  warning_items=""
  for item in "${detected[@]}"; do
    warning_items="${warning_items}\\n  • $item"
  done
  
  # Use jq to properly escape JSON
  output=$(jq -n --arg msg "🔒 SECURITY WARNING: Potential secrets or PII detected in your prompt:$warning_items\\n\\nDo NOT submit this prompt if you want to keep these secrets private. Review and remove sensitive data before proceeding." \
    '{
      permission: "ask",
      user_message: $msg,
      agent_message: "Hook detected potential secrets in prompt; user must approve submission."
    }')
  echo "$output"
  exit 0
fi

# No secrets detected; allow submission
echo '{ "permission": "allow" }'
exit 0
