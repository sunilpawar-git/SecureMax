#!/bin/bash

# Secrets Detection Hook
# Scans staged changes for API keys, tokens, credentials before commit
# Exit code 2 = secrets found, commit blocked
# Exit code 0 = all clear

set -e

SECRETS_FOUND=0

# Get staged files (what's being committed)
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || echo "")

if [ -z "$STAGED_FILES" ]; then
  echo "✅ No files staged"
  exit 0
fi

echo "🔐 Scanning for secrets in staged changes..."
echo ""

# ============================================================================
# 1. AWS Keys (AKIA...)
# ============================================================================
if git diff --cached | grep -qE "AKIA[0-9A-Z]{16}"; then
  echo "❌ AWS Access Key detected in staged changes"
  SECRETS_FOUND=1
fi

# ============================================================================
# 2. GitHub Tokens (ghp_, ghu_, ghs_, gho_)
# ============================================================================
if git diff --cached | grep -qE "gh[pousr]_[A-Za-z0-9_]{36,255}"; then
  echo "❌ GitHub token detected"
  SECRETS_FOUND=1
fi

# ============================================================================
# 3. Gemini API Keys (long alphanumeric strings in specific context)
# ============================================================================
if git diff --cached | grep -qEi 'GEMINI_API_KEY|gemini.*key.*=.*[a-zA-Z0-9]{40,}'; then
  echo "❌ Gemini API key pattern detected"
  SECRETS_FOUND=1
fi

# ============================================================================
# 4. Database Passwords — look for real credentials (not CI localhost URLs)
# ============================================================================
if git diff --cached | grep -qEi 'DB_PASSWORD=|postgres://[^:]+:[^@]{8,}@[^l]'; then
  echo "❌ Database credential pattern detected"
  SECRETS_FOUND=1
fi

# ============================================================================
# 5. NextAuth Secrets
# ============================================================================
if git diff --cached | grep -qEi 'NEXTAUTH_SECRET=|AUTH_SECRET='; then
  echo "❌ NextAuth secret detected (should not be in repo)"
  SECRETS_FOUND=1
fi

# ============================================================================
# 6. OAuth Client Secrets (Google, etc.)
# ============================================================================
if git diff --cached | grep -qEi 'CLIENT_SECRET=|OAUTH_SECRET=|GOOGLE_CLIENT_SECRET='; then
  echo "❌ OAuth client secret detected"
  SECRETS_FOUND=1
fi

# ============================================================================
# 7. Razorpay Keys
# ============================================================================
if git diff --cached | grep -qEi 'RAZORPAY_KEY=|RAZORPAY_SECRET='; then
  echo "❌ Razorpay credentials detected"
  SECRETS_FOUND=1
fi

# ============================================================================
# 8. Private Keys (RSA, PGP, etc.)
#    Use -- to prevent grep from treating the dashes as option flags.
# ============================================================================
if git diff --cached | grep -qE -- '-----BEGIN (RSA|OPENSSH|PGP) PRIVATE KEY|PRIVATE KEY-----'; then
  echo "❌ Private key detected"
  SECRETS_FOUND=1
fi

# ============================================================================
# 9. JWT Tokens (long base64 strings with dots)
# ============================================================================
if git diff --cached | grep -qE 'eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'; then
  echo "⚠️  JWT token pattern detected (review manually)"
  # Don't block for JWT, as they might be test tokens
  # SECRETS_FOUND=1
fi

# ============================================================================
# 10. .env files (should never be committed)
# ============================================================================
if git diff --cached --name-only | grep -qE '\.env(\.(local|development|production))?$'; then
  echo "❌ .env file detected in staged changes"
  SECRETS_FOUND=1
fi

# ============================================================================
# Result
# ============================================================================
echo ""
if [ $SECRETS_FOUND -eq 0 ]; then
  echo "✅ No secrets detected"
  exit 0
else
  echo "⚠️  If these are test/example values, review them manually:"
  echo "   git diff --cached | grep -E '(API|KEY|SECRET|PASSWORD)' -i"
  echo ""
  echo "To commit anyway (use only if you're sure):"
  echo "   git commit --no-verify"
  exit 2
fi
