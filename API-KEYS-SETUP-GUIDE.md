# Gemini API Key Setup — Step-by-Step

## ✅ Infrastructure is Ready

The secure infrastructure for managing API keys has been implemented. Now you just need to add your actual Gemini API key.

---

## 🔐 Option 1: Local Development (Quick Start)

### Step 1: Get Your Gemini API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select or create a project called `raivan-global`
3. Enable APIs:
   - Go to **APIs & Services** > **Library**
   - Search for `Generative AI` and enable it
   - Search for `Vertex AI API` and enable it
4. Create API Key:
   - Go to **APIs & Services** > **Credentials**
   - Click **Create Credentials** > **API Key**
   - Copy the key (it looks like: `AIza...`)

### Step 2: Add to `.env.local`

Create or edit `.env.local` in the project root:

```bash
# .env.local (NEVER commit this)

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/raivan_global"

# Gemini
GEMINI_API_KEY="AIza..." # ← Paste your key here
GEMINI_REGION="asia-south1"

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY="your-32-byte-hex-key"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"

# AI Service
AI_SERVICE_URL="http://localhost:8000"
AI_SERVICE_KEY="your-service-key"
```

### Step 3: Test It

```bash
# Start PostgreSQL (Docker)
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16

# Apply migrations
npx prisma migrate dev

# Start FastAPI
cd ai-service && uvicorn main:app --reload --port 8000

# Start Next.js (in another terminal)
npm run dev

# Visit http://localhost:3000/questionnaire
```

---

## 🔒 Option 2: Production (Recommended)

Once your app is running and you have a database, you can store your API key securely in the database (encrypted).

### Step 1: Create Admin Account

You need to set up an admin user. In your database:

```sql
INSERT INTO "users" (id, email, name, role, created_at, updated_at)
VALUES (
  'admin-cuid-id',
  'your-admin-email@raivanglobal.com',
  'Admin',
  'admin',
  NOW(),
  NOW()
);
```

Or use the Next.js UI to register, then run:

```sql
UPDATE "users" SET role = 'admin' WHERE email = 'your-email@raivanglobal.com';
```

### Step 2: Store API Key via Admin API

```bash
# First, get your session token by logging in via the UI
# Then:

curl -X POST http://localhost:3000/api/admin/api-keys?action=store \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_COOKIE" \
  -d '{
    "provider": "gemini",
    "keyName": "gemini-prod-primary",
    "keyValue": "AIza..."
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "API key for gemini stored successfully",
  "keyId": "clr1234567890"
}
```

### Step 3: Verify It's Working

```bash
# Check that the key is stored
curl -X GET http://localhost:3000/api/admin/api-keys?provider=gemini \
  -H "Authorization: Bearer YOUR_SESSION_COOKIE"

# Response
{
  "exists": true,
  "provider": "gemini",
  "message": "Active API key found (key content not returned for security)"
}
```

---

## 🚀 What Happens Next

Once the API key is configured:

1. **Questionnaire starts** → User selects property type (HNI) or facility (Enterprise)
2. **First question loads** → FastAPI retrieves the Gemini API key (encrypted)
3. **AI decision flow** → Gemini decides next question based on answer
4. **Scoring updates** → CPP domain scores update in real-time radar chart
5. **Report generation** → After all questions, Gemini generates audit findings
6. **PDF download** → User gets downloadable report with findings

---

## 🔐 Security Features (Built-In)

✅ **Encryption at Rest**
- Keys stored as AES-256-GCM ciphertext in database
- Cannot be read directly from database without `ENCRYPTION_KEY`

✅ **Server-Side Only**
- Keys never exposed to browser/client
- Used only in FastAPI backend
- Protected by middleware authentication

✅ **Audit Trail**
- Every API key access logged with timestamp
- `api_key_audits` table tracks: who, when, action, success/failure
- Immutable logs for compliance (DPDPA, GDPR)

✅ **Key Rotation**
- Rotate without downtime via `/api/admin/api-keys?action=rotate`
- Old key marked as `rotated` (still usable for short time)
- New key immediately active
- Zero impact on users

✅ **Revocation**
- Instantly revoke compromised keys
- Marked as `revoked` in database
- New key must be set before app can continue

---

## 📋 Next Steps

### 1. For Local Dev (This Week)
- [ ] Get Gemini API key from Google Cloud
- [ ] Add to `.env.local`
- [ ] Test questionnaire flow: `/questionnaire`
- [ ] Verify FastAPI can call Gemini API

### 2. For Production Deployment (When Ready)
- [ ] Set up admin account
- [ ] Store API key via `/api/admin/api-keys`
- [ ] Set GitHub Secrets for CI/CD
  - `GEMINI_API_KEY` → Your prod key
  - `DATABASE_URL` → Production DB
  - `ENCRYPTION_KEY` → Prod encryption key
- [ ] Deploy via GitHub Actions
- [ ] Verify in staging environment
- [ ] Deploy to production

### 3. Ongoing (Monthly/Quarterly)
- [ ] Review audit logs: `/api/admin/api-keys?action=audit`
- [ ] Rotate key every 90 days (set reminder)
- [ ] Monitor API usage and costs

---

## ❓ Troubleshooting

**Q: "Gemini API key not found"**
- A: Key hasn't been stored yet. Use Option 1 or 2 to add it.

**Q: "Decryption failed" in FastAPI logs**
- A: `ENCRYPTION_KEY` doesn't match. Ensure same key used for storing and retrieving.

**Q: "Unauthorized" when calling admin API**
- A: Not logged in as admin. Verify user role is `'admin'` in database.

**Q: "Failed to reach Gemini API"**
- A: Check API key is valid (copy-paste correctly)
- A: Verify Gemini API is enabled in Google Cloud
- A: Check firewall/VPN isn't blocking outbound traffic

---

## 📚 Full Documentation

See **SECURITY-SETUP.md** for comprehensive details on:
- Encryption implementation
- Key rotation procedures
- Audit log queries
- Compliance requirements
- Production best practices

---

## 📞 Ready?

Once you provide your Gemini API key, I can:
1. Add it to `.env.local` for you
2. Start the full questionnaire flow
3. Test end-to-end: property selection → scoring → report generation

**Provide your key here (securely):**
- Paste in chat (I won't log it)
- Or DM me directly
- Or add to `.env.local` yourself and test locally

Let's get this running! 🚀
