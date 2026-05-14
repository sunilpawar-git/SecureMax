# 📋 Phase 8 Quick Reference Card

## 🎯 Priorities

### Week 1: Foundation (Critical Path)
```
8.1 ▓▓▓▓░ Scraper Health Dashboard     (12h) ← START HERE
8.2 ▓▓▓▓░ Threat Intel Filters         (12h) ← PARALLEL

Goal: Know scraper status, find threat intel by domain
```

### Week 2: Sales Pipeline
```
8.3 ▓▓▓░░ Enterprise Leads Kanban      (12h)
8.4 ▓▓▓░░ Report Regeneration Queue    (10h)

Goal: Sales funnel operational, reports regenerate on-demand
```

### Week 3: Polish + Compliance
```
8.5 ▓▓░░░ LinkedIn OAuth Management     (8h)
8.6 ▓▓░░░ Analytics Dashboard           (10h)

Goal: KPIs visible, token safety proactive
```

### Week 4-5: Hardening + Go-Live Prep
```
8.7 ▓░░░░ Session Management            (6h)
8.8 ▓░░░░ Audit Log Export              (6h)
8.9 ▓░░░░ Webhook Monitoring            (8h)
8.10 ▓░░░░ Advanced Search               (8h)

Goal: Security + compliance ready, debugging easier
```

---

## 🏗️ Feature Summary

### 8.1: Scraper Health Dashboard
**UI Component:** Dashboard card + per-source status table
**Data Flow:** Query `scraper_runs` table → SSE stream → Real-time updates
**Key UI:** 
- Per-source success rate (%)
- Last run time
- Articles ingested (24h, 7d)
- Error log (clickable)
- Manual trigger button
- 🟢/🟡/🔴 health indicator

**Acceptance:** Success rate visible, manual trigger works, SSE < 2s latency

---

### 8.2: Threat Intel Advanced Filtering
**UI Component:** Filter panel + table with bulk actions
**Data Flow:** Multi-select filters → Query threat_intel → Bulk update
**Key Filters:**
- CPP domain (7 checkboxes: CPP-01, CPP-02, ... CPP-07)
- Industry tags (warehouse, logistics, retail, etc.)
- Date range picker
- Search (title + URL)
- Used-in-reports flag

**Bulk Actions:**
- Mark as used
- Soft-delete
- Assign to report

**Acceptance:** All filters work, bulk delete preserves audit trail, used flag visible

---

### 8.3: Enterprise Leads Kanban Pipeline
**UI Component:** 4-column Kanban board (drag-drop enabled)
**Data Flow:** Drag status → PATCH /api/admin/leads → Update DB + unlock report if proposal_sent
**Statuses:**
1. New (just submitted)
2. Contacted (email sent)
3. Proposal Sent (report unlocked)
4. Closed (deal won)

**Card Details:** Company, contact, facilities count, cities, time-in-status
**Inline Actions:**
- Email template → bulk send
- Unlock report (sets enterprise_report_unlocked = true)
- View session details
- Mark closed

**Acceptance:** Drag-drop updates DB, email template renders, report unlock works

---

### 8.4: Report Regeneration Queue
**UI Component:** Queue status table + progress bar per job
**Data Flow:** Click regenerate → Enqueue job → Poll via SSE → Show progress
**Queue State:**
- Queued → Processing → Success/Failed (retry count shown)
- Max 3 retries with 2^n exponential backoff

**UI Details:**
- Job ID (session_id)
- Status badge (🔵 Queued, 🟡 Processing, 🟢 Success, 🔴 Failed)
- Retry count (3/3)
- Cancel button (if in queue)
- Error log (if failed)

**Acceptance:** Job queues, progress updates in real-time, retries work, max 3 limit

---

### 8.5: LinkedIn OAuth Token Management
**UI Component:** Token status card + action buttons
**Data Flow:** Fetch token → Check expiry → Show warning/refresh button
**Status Display:**
- Connected: ✅
- Days until expiry: 23 days (or ⚠️ 5 days warning)
- Last refreshed: 2026-05-10
- Rate limit remaining: 450/500

**Actions:**
- Refresh Now (1-click)
- Disconnect (2-step confirmation)

**Acceptance:** Expiry warning < 7 days, refresh updates DB, disconnect removes token

---

### 8.6: Analytics Dashboard
**UI Component:** KPI cards + charts
**KPI Cards:**
- Sessions (today, week, month)
- Conversion rate (%)
- Revenue (month, track breakdown)
- Threat intel (articles/day)

**Charts:**
- Session trend (7-day line chart)
- Conversion funnel (sessions → free summary → paid → booked)
- Revenue breakdown (HNI vs Enterprise)
- Top CPP domains by critical findings

**Data Source:** Daily snapshot (async cache update)

**Acceptance:** KPIs load < 1s, conversion rate calculated, charts render

---

### 8.7: Session Management
**UI Component:** Active sessions table
**Columns:**
- Session ID
- User email
- Track (HNI/Enterprise)
- Current node (Q12/Q34)
- Idle time (0min, 45min, 120min+)
- Actions (view, force logout, kill if idle > 2h)

**Acceptance:** Sessions listed, force logout marks abandoned, kill button works

---

### 8.8: Audit Log Export
**UI Component:** Export button + date range picker
**Export Format:** CSV
**Columns:**
- Timestamp
- Admin ID (anonymized)
- Action type (email_sent, status_changed, report_unlocked, etc.)
- Entity (lead_id, session_id)
- Details (JSON)

**Filters:**
- Date range
- Entity type (lead, session, report)

**Acceptance:** CSV downloads, headers correct, PII anonymized

---

### 8.9: Webhook Monitoring
**UI Component:** Per-provider status table
**Columns:**
- Provider (RazorPay, LinkedIn)
- Status (✅ OK, ⚠️ Degraded, ❌ Error)
- Events (last 24h)
- Failed (count + button to view)
- Last retry (timestamp)
- Retry count (3/5)

**Replay Button:** Failed webhook → Resend with signature verification

**Acceptance:** Status displayed, retry count accurate, replay button works

---

### 8.10: Advanced Search
**UI Component:** Global search bar + results grouped by type
**Search Scope:**
- Sessions (by ID, user, node ID)
- Users (by email, company)
- Leads (by company, contact, city)
- Threat intel (by title, URL, domain)

**Results Display:**
- Grouped by type
- Snippet (first 100 chars)
- Click to view full entity

**Acceptance:** Search finds all entity types, results grouped, click navigates

---

## 📊 Database Changes

### New Tables

#### scraper_runs
```sql
CREATE TABLE scraper_runs (
  id SERIAL PRIMARY KEY,
  source VARCHAR(50),           -- news_api, rss, playwright
  status VARCHAR(20),           -- pending, running, success, error
  articles_count INT,
  errors TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### admin_actions
```sql
CREATE TABLE admin_actions (
  id SERIAL PRIMARY KEY,
  admin_id VARCHAR(255),        -- user.id
  action_type VARCHAR(100),     -- email_sent, status_changed, report_unlocked
  entity_id VARCHAR(255),       -- lead_id, session_id, threat_intel_id
  entity_type VARCHAR(50),      -- lead, session, threat_intel
  metadata JSONB,               -- extra context
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### api_tokens
```sql
CREATE TABLE api_tokens (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50),         -- linkedin, shopify, etc.
  token_encrypted VARCHAR(1024),-- AES-256 encrypted
  expires_at TIMESTAMPTZ,
  refresh_token_encrypted VARCHAR(1024),
  rate_limit_remaining INT,
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider)
);
```

#### webhook_logs
```sql
CREATE TABLE webhook_logs (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50),         -- razorpay, linkedin
  event_type VARCHAR(100),      -- payment.authorized, post.published
  payload JSONB,
  signature VARCHAR(1024),
  status VARCHAR(20),           -- success, failed, retrying
  retry_count INT DEFAULT 0,
  error_log TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### New Columns (Existing Tables)

#### audit_sessions
```sql
ALTER TABLE audit_sessions ADD COLUMN
  enterprise_report_unlocked BOOLEAN DEFAULT FALSE;
```

---

## 🔗 API Endpoints (Phase 8)

### Scraper Health
```
GET  /api/admin/scraper/status          → SSE stream: per-source status
POST /api/admin/scraper/trigger         → Enqueue scrape (optional source)
```

### Threat Intel
```
GET  /api/admin/threat-intel            → List with filters
POST /api/admin/threat-intel/bulk-delete → Soft-delete by IDs
POST /api/admin/threat-intel/assign     → Assign to report
```

### Enterprise Leads
```
GET  /api/admin/leads                   → All leads (paginated)
PATCH /api/admin/leads/:id              → Update status
POST /api/admin/leads/bulk-email        → Send template to multiple
POST /api/admin/leads/:id/unlock-report → Set enterprise_report_unlocked
```

### Report Queue
```
POST /api/admin/reports/regenerate/:sessionId  → Enqueue job
GET  /api/admin/reports/queue                  → Status of all jobs
```

### LinkedIn OAuth
```
GET  /api/admin/linkedin/auth           → Token status
POST /api/admin/linkedin/auth            → Refresh or disconnect
```

### Analytics
```
GET  /api/admin/analytics               → KPI + chart data
```

### Sessions
```
GET  /api/admin/sessions                → All active sessions
DELETE /api/admin/sessions/:id          → Force logout
```

### Audit Export
```
GET  /api/admin/audit-export            → CSV download
```

### Webhooks
```
GET  /api/admin/webhooks                → Per-provider status
POST /api/admin/webhooks/:id/replay     → Resend failed webhook
```

### Search
```
GET  /api/admin/search?q=...            → Global search
```

---

## 🧪 Testing Checklist

- [ ] Scraper health: per-source success rate calculated correctly
- [ ] Threat intel: filters applied, bulk delete immutable
- [ ] Leads: drag-drop updates status, email sends, report unlocks
- [ ] Report queue: job retries max 3x, backoff exponential
- [ ] LinkedIn: expiry warning < 7 days, refresh succeeds, disconnect removes
- [ ] Analytics: KPIs accurate, conversion rate matches DB
- [ ] Sessions: all active sessions listed, force logout works
- [ ] Audit export: CSV format correct, PII anonymized
- [ ] Webhooks: failed webhook replay succeeds, signature verified
- [ ] Search: finds all entity types, groups by type

---

## 📋 Deployment Checklist (Phase 8)

- [ ] Database migrations: all 4 new tables + columns created
- [ ] Environment variables: API keys for new services (if any)
- [ ] Tests: 100% Phase 8 acceptance criteria passing
- [ ] Security audit: no new vulnerabilities (OWASP Top 10 check)
- [ ] Documentation: runbook + operations guide updated
- [ ] Monitoring: logs + metrics for new features
- [ ] Team training: admins trained on new dashboards
- [ ] Staging: Phase 8 deployed to staging, smoke tested
- [ ] Production: Phase 8 deployed to production with rollback plan

---

## ⚡ Quick Command Reference

```bash
# Start Phase 8 feature work
git checkout -b feat/admin-scraper-health

# Build & test locally
npm run build && npm test

# Run Python tests
cd ai-service && pytest

# Check linting
npm run lint && cd ai-service && ruff check .

# Commit & push
git add . && git commit -m "feat(phase-8.1): scraper health dashboard"
git push origin feat/admin-scraper-health

# Create PR
gh pr create --title "feat(admin): scraper health dashboard" --body "Closes #123"
```

---

## 📞 Decision Log (Phase 8)

1. **Async processing:** APScheduler (not Celery) — simpler for MVP
2. **Leads UI:** Kanban (not table) — better UX for sales ops
3. **Email:** Pre-written templates (not external editor) — faster ship
4. **Analytics:** Daily cache (not real-time) — good enough for admins
5. **Search:** Global across all entities (not per-entity) — faster debugging

---

**Last updated:** 2026-05-14  
**Status:** Ready to begin Week 1  
**Next:** Create feature branches + kickoff standup
