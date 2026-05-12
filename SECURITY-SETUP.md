# Security & API Key Setup Guide

## Overview

This document explains how to securely manage API keys (Gemini, OpenAI, etc.) in the Raivan Global Security Crawler.

**Key Principles:**
- ✅ Keys are **encrypted at rest** using AES-256-GCM
- ✅ Keys are **server-side only** — never exposed to client
- ✅ All access is **audited** with timestamps and actor information
- ✅ Keys support **rotation** without downtime
- ✅ Revocation prevents **accidental leaks** from being exploited

---

## 1. Initial Setup: Adding Your First Gemini API Key

### Step 1: Get Gemini API Key from Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing): `raivan-global`
3. Enable these APIs:
   - Generative AI API
   - Vertex AI API
4. Go to **Credentials** > Create API Key
5. Copy the API key (keep it secret!)

### Step 2: Store Key via Admin API (Production)

Once your admin account is set up, use the secure API endpoint:

```bash
curl -X POST https://raivanglobal.com/api/admin/api-keys?action=store \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gemini",
    "keyName": "gemini-prod-primary",
    "keyValue": "YOUR_ACTUAL_API_KEY_HERE"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "API key for gemini stored successfully",
  "keyId": "cuid-key-id-here"
}
```

### Step 3: Store Key via Environment (Development Only)

For local development, you can still use `.env.local`:

```bash
# .env.local (NEVER commit this file)
GEMINI_API_KEY="your-api-key-here"
GEMINI_REGION="asia-south1"
DATABASE_URL="postgresql://..."
```

**Important:** The FastAPI backend will load this on startup. In production, keys come from the encrypted database only.

---

## 2. How Keys Are Used in the Application

### Frontend (Next.js)
- **Never stores** API keys
- Calls `/api/questionnaire` (internal API route)
- No direct contact with external APIs

### Backend API Route (`src/app/api/questionnaire/route.ts`)
- Routes requests to FastAPI service
- Does NOT use API keys directly
- Acts as a proxy for authentication

### AI Microservice (FastAPI)
- Calls `getApiKey('gemini', { decryptedKey: true })` to retrieve the key
- Uses it to call Gemini API
- Logs all access with timestamp and outcome
- Returns results to Next.js API route

**Data Flow:**
```
User (Browser)
  ↓
Next.js API Route (/api/questionnaire)
  ↓
FastAPI Service (/questionnaire/start, /questionnaire/answer, etc.)
  ↓
[getApiKey('gemini')] → Retrieve from encrypted database
  ↓
Gemini API
```

---

## 3. Key Rotation (Zero-Downtime)

When you need to rotate your API key (e.g., quarterly, or if compromised):

### Option A: Via Admin API

```bash
curl -X POST https://raivanglobal.com/api/admin/api-keys?action=rotate \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gemini",
    "newKeyValue": "YOUR_NEW_API_KEY_HERE"
  }'
```

**What happens:**
1. Old key marked as `rotated` (timestamp recorded)
2. New key created as `active`
3. All future API calls use new key
4. Old sessions continue (with cached keys) until expiry
5. Audit log records the rotation action

### Option B: Manual in Database

If needed, you can directly query the database (with care):

```sql
-- View current active key metadata (NOT the key itself)
SELECT id, provider, status, last_used_at, created_at
FROM api_keys
WHERE provider = 'gemini' AND status = 'active';

-- View audit trail
SELECT action, actor, status, created_at
FROM api_key_audits
WHERE api_key_id = 'YOUR_KEY_ID'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 4. Audit & Compliance

### View Audit Log via Admin API

```bash
curl -X POST https://raivanglobal.com/api/admin/api-keys?action=audit \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keyId": "cuid-key-id",
    "limit": 100
  }'
```

**Audit fields:**
- `action`: created, used, rotated, revoked
- `actor`: Email of admin or "system" / "api"
- `status`: success or failed
- `createdAt`: ISO timestamp
- `errorMsg`: If action failed, the reason

### Compliance Features

- ✅ **Immutable audit log** — Cannot delete or modify historical records
- ✅ **Per-provider uniqueness** — Only one active key per provider
- ✅ **Timestamp tracking** — `lastUsedAt` for quota/cost monitoring
- ✅ **Rotation history** — Old keys marked `rotated` with timestamp
- ✅ **Revocation audit** — Compromised keys marked with reason

---

## 5. GitHub Secrets for CI/CD

The CI/CD pipeline uses GitHub Secrets for sensitive values. Set these in your GitHub repository settings:

### Required Secrets

```
GEMINI_API_KEY          → Your Gemini API key
DATABASE_URL            → PostgreSQL connection (staging)
ENCRYPTION_KEY          → AES-256 key (base64)
NEXTAUTH_SECRET         → NextAuth.js secret
GOOGLE_CLIENT_ID        → OAuth credentials
GOOGLE_CLIENT_SECRET    → OAuth credentials
```

### How to Set Secrets

1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Click **New repository secret**
3. Add each secret (name and value)

**CLI alternative:**
```bash
gh secret set GEMINI_API_KEY --body "your-key-here"
gh secret set ENCRYPTION_KEY --body "$(openssl rand -hex 32)"
```

---

## 6. Security Best Practices

### Do's ✅
- ✅ Rotate keys quarterly (set a calendar reminder)
- ✅ Use different keys for dev, staging, prod
- ✅ Audit logs regularly (weekly or monthly)
- ✅ Revoke immediately if key is exposed
- ✅ Use strong, randomly generated encryption keys
- ✅ Store backups of `.env.local` (dev only) in a password manager

### Don'ts ❌
- ❌ Never commit `.env` or `.env.local` to git
- ❌ Never log the actual key value
- ❌ Never share keys via Slack, email, or unencrypted channels
- ❌ Never use the same key across environments (dev, staging, prod)
- ❌ Never store keys in browser localStorage or sessionStorage
- ❌ Never expose the `ENCRYPTION_KEY` in code

### If a Key is Compromised

1. **Immediately revoke** via the admin API
2. **Generate a new key** from the provider (Google Cloud, OpenAI, etc.)
3. **Store the new key** via the admin API
4. **Check audit logs** for any suspicious access
5. **Report to security team** if external breach suspected

---

## 7. Encryption Details

### At-Rest Encryption (Database)

Keys are encrypted using **AES-256-GCM**:
- **Algorithm**: AES (Advanced Encryption Standard)
- **Key size**: 256 bits
- **Mode**: GCM (Galois/Counter Mode) — provides authenticity + confidentiality
- **Encryption key**: Stored in `ENCRYPTION_KEY` env var (never in code)

```typescript
// Example: src/lib/encryption.ts
const encrypted = encrypt(apiKeyValue);
// Returns: { ciphertext: "...", iv: "...", authTag: "..." }
// Stored in database as `keyEncrypted` field
```

### In-Transit Encryption

- ✅ All API calls use **HTTPS/TLS 1.3**
- ✅ Keys are decrypted **only in server-side code**
- ✅ Never passed to client-side JavaScript
- ✅ FastAPI backend communicates securely with Gemini API

---

## 8. Testing Locally

### Using `.env.local`

For development, your `.env.local` file should contain:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/raivan_global"

# Gemini
GEMINI_API_KEY="your-test-key-here"
GEMINI_REGION="asia-south1"

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY="your-32-byte-hex-key-here"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# AI Service
AI_SERVICE_URL="http://localhost:8000"
AI_SERVICE_KEY="your-service-key-here"
```

### Local Testing Flow

1. **Start PostgreSQL**: Docker or local installation
2. **Seed database**: `npx prisma db push`
3. **Start FastAPI**: `cd ai-service && uvicorn main:app --reload`
4. **Start Next.js**: `npm run dev`
5. **Access app**: http://localhost:3000

---

## 9. Monitoring & Alerts

### Key Usage Metrics

Monitor these via `api_key_audits` table:

```sql
-- Last 7 days of API key usage
SELECT DATE(created_at), COUNT(*), COUNT(DISTINCT action) as actions
FROM api_key_audits
WHERE api_key_id = 'YOUR_KEY_ID'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;

-- Failed access attempts
SELECT action, actor, error_msg, COUNT(*)
FROM api_key_audits
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '1 day'
GROUP BY action, actor, error_msg;
```

### Set Up Alerts (Future)

- [ ] Weekly audit report (email)
- [ ] Alert if failed access attempts exceed threshold
- [ ] Alert if key not used for 30 days
- [ ] Alert on key rotation

---

## 10. Support

For issues or questions:

1. Check the **Troubleshooting** section below
2. Review **audit logs** for clues
3. Open an issue with the `[security]` label
4. Contact the security team

### Troubleshooting

**Problem:** "API key for gemini not found"
- **Cause:** No active key stored in database
- **Fix:** Run the store endpoint with valid key

**Problem:** "Decryption failed"
- **Cause:** Wrong `ENCRYPTION_KEY` or corrupted cipher
- **Fix:** Verify `ENCRYPTION_KEY` matches the key used to encrypt

**Problem:** "Unauthorized" on admin API endpoint
- **Cause:** User is not admin
- **Fix:** Verify session and user role in database

---

**Last Updated:** 2026-05-12  
**Version:** 1.0  
**Status:** Gold Standard
