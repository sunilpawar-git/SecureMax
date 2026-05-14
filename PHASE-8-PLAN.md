# 🎯 Phase 8: Advanced Admin Panel & Operational Excellence

**Date:** May 14, 2026  
**Status:** Planning (Phase 1-7 Complete ✅)  
**Est. Effort:** 3-5 weeks  
**Priority:** Critical Path to MVP

---

## 📊 Current State Assessment

### ✅ What Phase 1-7 Delivered

| Phase | Feature | Status | Completion |
|-------|---------|--------|-----------|
| **Phase 0** | Repo scaffold, Docker, CI/CD | ✅ Complete | 100% |
| **Phase 1** | Prisma schema (8 tables) | ✅ Complete | 100% |
| **Phase 2** | NextAuth.js (Google/Microsoft/OIDC) + DPDPA | ✅ Complete | 100% |
| **Phase 3** | CPP embedding pipeline (pgvector 768-dim) | ✅ Complete | 100% |
| **Phase 4** | Dual-track questionnaire (HNI + Enterprise) + live radar | ✅ Complete | 100% |
| **Phase 5** | Report generation (HNI 8-sec, Enterprise 10-sec) | ✅ Complete | 100% |
| **Phase 6** | RazorPay paywall (HNI) + Enterprise proposal form | ✅ Complete | 100% |
| **Phase 7** | Threat intel (News API + RSS + Playwright) | ✅ Complete | 100% |

### 🏗️ Codebase Structure Confirmed

```
src/
├── app/
│   ├── admin/                    ✅ Routes scaffolded
│   │   ├── page.tsx             ✅ Dashboard
│   │   ├── layout.tsx           ✅ Layout
│   │   ├── scraper/             ✅ Scraper management
│   │   ├── linkedin/            ✅ LinkedIn integration
│   │   ├── leads/               ✅ Enterprise leads pipeline
│   │   └── reports/             ✅ Report management
│   └── api/
│       ├── admin/               ✅ API endpoints
│       └── questionnaire/       ✅ Q&A logic
├── components/
│   ├── admin/                   ✅ Admin-specific UI
│   └── report/                  ✅ PDF templates
└── lib/
    ├── ai-service.ts           ✅ FastAPI bridge
    ├── auth.ts                 ✅ NextAuth config
    └── encryption.ts           ✅ Data encryption

ai-service/
├── routers/
│   ├── scraper.py              ✅ Scraper trigger + cron
│   ├── questionnaire.py        ✅ Q&A branching + Gemini
│   ├── report.py               ✅ Findings + compliance
│   └── linkedin.py             ✅ LinkedIn post drafting
├── scripts/
│   ├── seed_cpp_embeddings.py  ✅ Embeddings
│   └── seed_question_graph.py  ✅ Question graph
└── tests/                       ✅ 142 tests passing
```

### 📈 Test Coverage
- **Jest (Next.js):** 7 suites, 142 tests, **0 failures** ✅
- **Pytest (Python):** Full async/await test harness ✅
- **Build:** Production build passing ✅
- **Linting:** ESLint, Prettier, Ruff all clean ✅

---

## 🔍 Phase 8 Scope: Advanced Admin Panel

### Current Admin Panel Status

**What's built:**
- ✅ Role-gated middleware (superadmin via env var)
- ✅ Scraper dashboard UI (basic)
- ✅ Threat intel review table
- ✅ LinkedIn post workflow (draft → approve → publish)
- ✅ HNI follow-up dashboard (users who haven't booked)
- ✅ Enterprise leads pipeline (status transitions)
- ✅ Report management (list, trigger regeneration)
- ✅ Session audit log (read-only events)

**What's incomplete or needs enhancement:**
- 🟨 Scraper health monitoring (per-source failure tracking)
- 🟨 Advanced threat intel filtering (multi-domain, industry, date range)
- 🟨 LinkedIn OAuth token management (expiry warnings, refresh flow)
- 🟨 Batch actions (multi-select threat intel, bulk enterprise lead status update)
- 🟨 Analytics dashboard (metrics: sessions/day, conversion rate, revenue)
- 🟨 User session management (kill active session, force logout)
- 🟨 Audit log export (CSV for compliance)
- 🟨 Report regeneration queue (async job tracking)
- 🟨 Advanced search/filter across all entities
- 🟨 Webhook monitoring (RazorPay, LinkedIn API health)

---

## 🎯 Phase 8 Objectives

### Primary Goals (MVP-Critical)
1. **Scraper Health Dashboard** — per-source success rate, last run, error logs
2. **Threat Intel Management** — advanced filtering (domain, industry, date), bulk actions, soft-delete audit
3. **Enterprise Leads Pipeline** — Kanban-style status board, bulk email trigger, proposal unlock flow
4. **Report Regeneration Queue** — async job tracking, per-session retry count
5. **LinkedIn OAuth Management** — token expiry warnings, refresh flow, rate limit monitoring

### Secondary Goals (Polish + Compliance)
6. **Analytics Snapshot** — key metrics dashboard (sessions, conversion, revenue, threat intel ingested)
7. **Session Management** — force logout, kill stuck sessions, concurrent session tracking
8. **Audit Log Export** — CSV export for compliance (DPDPA, ISO 27001)
9. **Webhook Monitoring** — RazorPay/LinkedIn/API health status with retry count
10. **Advanced Search** — cross-entity search (sessions, leads, threat intel, users)

---

## 🏗️ Technical Architecture

### Admin Panel Stack (Already Decided)
- **Framework:** Next.js 14 App Router
- **UI Library:** Material Design 3 (shadcn/ui)
- **State:** Server Components (RSC) + tanstack/query for mutations
- **Real-time:** SSE polling for async job progress
- **Auth:** NextAuth.js role middleware

### Backend Stack (FastAPI)
- **Endpoints:** `/api/admin/*` (role-gated)
- **Async Jobs:** APScheduler + Redis (optional, Queue if needed)
- **Webhooks:** X-Service-Key auth + idempotent replay
- **Logging:** Structured JSON logs (ECS format)

### Database Tables (Minimal Changes)
Current schema is sufficient. New columns only if needed:
- `scraper_runs` (NEW) — track each scraper execution: `timestamp`, `source`, `status`, `articles_count`, `errors`
- `admin_actions` (NEW) — audit trail of admin actions: `admin_id`, `action_type`, `entity_id`, `timestamp`
- `api_tokens` (NEW) — LinkedIn OAuth + third-party API tokens: `provider`, `token_encrypted`, `expires_at`, `refresh_token`

---

## 📋 Phase 8 Breakdown (Detailed)

### 8.1: Scraper Health Dashboard (Priority 1)

**What to build:**
- Per-source success rate (%) — News API, RSS, Playwright
- Last run timestamp
- Articles ingested (last 24h, last 7d)
- Error logs (clickable to view full error)
- Manual trigger button (same session)
- Health status indicator (🟢 OK / 🟡 Degraded / 🔴 Error)

**Implementation:**

Frontend (`src/app/admin/scraper/page.tsx`):
```tsx
// Real-time status via SSE polling
useEffect(() => {
  const eventSource = new EventSource('/api/admin/scraper/status')
  eventSource.onmessage = (e) => setScraperStatus(JSON.parse(e.data))
}, [])

// Trigger manual scrape
const triggerScrape = async (source?: string) => {
  await fetch('/api/admin/scraper/trigger', {
    method: 'POST',
    body: JSON.stringify({ source })
  })
}
```

Backend (`ai-service/routers/admin.py`):
```python
@router.get("/admin/scraper/status")
async def scraper_status():
    # SSE stream
    # Query each source from scraper_runs table
    # Return: last_run, success_rate, articles_count, errors
    
@router.post("/admin/scraper/trigger")
async def trigger_scrape(source: Optional[str]):
    # Enqueue scrape job
    # Track in scraper_runs
```

**Database:** New `scraper_runs` table:
```sql
CREATE TABLE scraper_runs (
  id SERIAL PRIMARY KEY,
  source VARCHAR(50),
  status VARCHAR(20), -- pending, running, success, error
  articles_count INT,
  errors TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

---

### 8.2: Advanced Threat Intel Filtering (Priority 1)

**What to build:**
- Multi-select filter: CPP domain, industry tag, date range
- Search bar (title + URL)
- Bulk actions: mark used, soft-delete, assign to report
- Column sorting: date, domain, industry, source
- Used-in-reports flag visualization

**Implementation:**

Frontend (`src/app/admin/scraper/threat-intel.tsx`):
```tsx
interface FilterState {
  domains: string[] // CPP-01, CPP-02, etc.
  industries: string[] // warehouse, logistics, etc.
  dateRange: [Date, Date]
  search: string
  usedOnly: boolean
}

// Query with filters
const { data } = useQuery({
  queryKey: ['threat-intel', filters],
  queryFn: () => fetch('/api/admin/threat-intel?filters=...').then(r => r.json())
})

// Bulk actions
const bulkDelete = async (ids: string[]) => {
  await fetch('/api/admin/threat-intel/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids })
  })
}
```

Backend (`src/app/api/admin/threat-intel/route.ts`):
```typescript
export async function GET(req: Request) {
  const { domains, industries, startDate, endDate, search, usedOnly } = req.nextUrl.searchParams
  
  let query = db.threat_intel.findMany({
    where: {
      AND: [
        domains.length > 0 ? { domain_tags: { hasSome: domains } } : {},
        industries.length > 0 ? { industry_tags: { hasSome: industries } } : {},
        startDate ? { scraped_at: { gte: startDate } } : {},
        endDate ? { scraped_at: { lte: endDate } } : {},
        search ? { OR: [{ title: { contains: search } }, { url: { contains: search } }] } : {},
        usedOnly ? { used_in_reports: true } : {}
      ]
    }
  })
  
  return Response.json(query)
}
```

---

### 8.3: Enterprise Leads Pipeline (Priority 1)

**What to build:**
- Kanban board: New → Contacted → Proposal Sent → Closed
- Drag-drop to transition status
- Inline actions: email template, send proposal, unlock report, close deal
- Bulk email: pre-written template or custom
- Time-in-status tracking (for SLA)
- Search/filter by company, contact, city

**Implementation:**

Frontend (`src/app/admin/leads/page.tsx`):
```tsx
interface Lead {
  id: string
  company: string
  contact: string
  status: 'new' | 'contacted' | 'proposal_sent' | 'closed'
  cities: string[]
  createdAt: Date
  lastUpdatedAt: Date
}

// Kanban board using @hello-pangea/dnd or similar
<DragDropContext onDragEnd={handleDragEnd}>
  {['new', 'contacted', 'proposal_sent', 'closed'].map(status => (
    <Droppable droppableId={status} key={status}>
      {leads.filter(l => l.status === status).map(lead => (
        <Card key={lead.id}>
          <LeadCard
            lead={lead}
            onStatusChange={(newStatus) => updateLeadStatus(lead.id, newStatus)}
            onEmailClick={() => openEmailModal(lead)}
            onUnlockReport={() => unlockReport(lead.source_session_id)}
          />
        </Card>
      ))}
    </Droppable>
  ))}
</DragDropContext>
```

Backend (`src/app/api/admin/leads/route.ts`):
```typescript
export async function PATCH(req: Request) {
  const { leadId, newStatus } = await req.json()
  
  const lead = await db.enterprise_leads.update({
    where: { id: leadId },
    data: {
      status: newStatus,
      lastUpdatedAt: new Date()
    }
  })
  
  // If status = 'proposal_sent', unlock the report
  if (newStatus === 'proposal_sent') {
    await db.audit_sessions.update({
      where: { id: lead.source_session_id },
      data: { enterprise_report_unlocked: true }
    })
  }
  
  return Response.json(lead)
}

// Bulk email
export async function POST(req: Request) {
  const { leadIds, emailTemplate, subject } = await req.json()
  
  const leads = await db.enterprise_leads.findMany({
    where: { id: { in: leadIds } }
  })
  
  for (const lead of leads) {
    // Send email (via SendGrid or similar)
    await sendEmail({
      to: lead.preferred_contact,
      subject,
      body: emailTemplate.replace('{company}', lead.company)
    })
    
    // Log action
    await db.admin_actions.create({
      data: {
        admin_id: req.user.id,
        action_type: 'email_sent',
        entity_id: lead.id
      }
    })
  }
}
```

---

### 8.4: Report Regeneration Queue (Priority 2)

**What to build:**
- Async queue for report regeneration
- Per-session retry count (max 3)
- Progress tracking (SSE)
- Cancel job button
- Success/failure notification

**Implementation:**

Backend (`ai-service/routers/admin.py`):
```python
from celery import Celery  # or use built-in asyncio.Queue for MVP
from datetime import datetime

# Queue: ReportJob = (session_id, status, retry_count, error_log)
report_queue = []

@router.post("/admin/reports/regenerate/{session_id}")
async def regenerate_report(session_id: str):
    job = {
        'session_id': session_id,
        'status': 'queued',
        'retry_count': 0,
        'created_at': datetime.now()
    }
    report_queue.append(job)
    
    # Trigger async generation
    asyncio.create_task(process_report_job(job))
    
    return { 'job_id': job['session_id'], 'status': 'queued' }

@router.get("/admin/reports/queue")
async def report_queue_status():
    # Return all jobs with status
    return report_queue

async def process_report_job(job):
    try:
        job['status'] = 'processing'
        findings = await generate_findings(job['session_id'])
        pdf_bytes = await render_pdf(findings)
        await store_report(job['session_id'], pdf_bytes)
        job['status'] = 'success'
    except Exception as e:
        if job['retry_count'] < 3:
            job['retry_count'] += 1
            job['status'] = 'retrying'
            await asyncio.sleep(2 ** job['retry_count'])  # Exponential backoff
            await process_report_job(job)
        else:
            job['status'] = 'failed'
            job['error_log'] = str(e)
```

Frontend (`src/app/admin/reports/page.tsx`):
```tsx
// Poll queue status
useEffect(() => {
  const interval = setInterval(async () => {
    const queue = await fetch('/api/admin/reports/queue').then(r => r.json())
    setReportQueue(queue)
  }, 2000)
  
  return () => clearInterval(interval)
}, [])

// Regenerate button
const regenerateReport = async (sessionId: string) => {
  const response = await fetch(`/api/admin/reports/regenerate/${sessionId}`, {
    method: 'POST'
  })
  const job = await response.json()
  toast.success(`Report regeneration queued (job: ${job.job_id})`)
}
```

---

### 8.5: LinkedIn OAuth & Token Management (Priority 2)

**What to build:**
- Token expiry warning (red banner if < 7 days)
- Manual refresh flow
- Disconnect button
- Rate limit tracking

**Implementation:**

Backend (`src/app/api/admin/linkedin/auth/route.ts`):
```typescript
export async function GET(req: Request) {
  // Get current token status
  const token = await db.api_tokens.findUnique({
    where: { provider: 'linkedin' }
  })
  
  return Response.json({
    connected: !!token,
    expiresAt: token?.expires_at,
    daysUntilExpiry: token ? Math.floor((token.expires_at - new Date()) / (1000 * 60 * 60 * 24)) : null,
    lastRefreshedAt: token?.last_refreshed_at,
    rateLimitRemaining: token?.rate_limit_remaining || null
  })
}

export async function POST(req: Request) {
  const { action } = await req.json()
  
  if (action === 'refresh') {
    const token = await refreshLinkedInToken()
    // Update DB
    await db.api_tokens.update({
      where: { provider: 'linkedin' },
      data: {
        token_encrypted: encryptToken(token.access_token),
        expires_at: new Date(Date.now() + token.expires_in * 1000),
        last_refreshed_at: new Date()
      }
    })
  } else if (action === 'disconnect') {
    await db.api_tokens.delete({
      where: { provider: 'linkedin' }
    })
  }
}
```

Frontend (`src/app/admin/linkedin/page.tsx`):
```tsx
export default async function LinkedInAdminPage() {
  const status = await fetch('/api/admin/linkedin/auth').then(r => r.json())
  
  return (
    <div>
      {status.connected ? (
        <>
          {status.daysUntilExpiry < 7 && (
            <Alert severity="warning">
              LinkedIn token expires in {status.daysUntilExpiry} days.
              <Button onClick={() => refreshToken()}>Refresh Now</Button>
            </Alert>
          )}
          <Button onClick={() => disconnectLinkedIn()}>Disconnect</Button>
        </>
      ) : (
        <Button href="/api/oauth/linkedin">Connect LinkedIn</Button>
      )}
    </div>
  )
}
```

---

### 8.6: Analytics Dashboard (Priority 3)

**What to build:**
- KPI cards: sessions today/week/month, conversion rate, revenue
- Charts: session trends, conversion funnel, revenue by track
- Threat intel ingestion rate (articles/day)
- Top CPP domains by risk level
- User cohort analysis

**Implementation:**

Backend (`src/app/api/admin/analytics/route.ts`):
```typescript
export async function GET(req: Request) {
  const [
    sessionsToday,
    sessionsThisWeek,
    sessionsThisMonth,
    conversionsThisMonth,
    revenueThisMonth,
    threatIntelCount,
    topDomains
  ] = await Promise.all([
    db.audit_sessions.count({
      where: { created_at: { gte: startOfDay(new Date()) } }
    }),
    db.audit_sessions.count({
      where: { created_at: { gte: startOfWeek(new Date()) } }
    }),
    // ... etc
  ])
  
  return Response.json({
    kpis: {
      sessionsToday,
      sessionsThisWeek,
      sessionsThisMonth,
      conversionRate: (conversionsThisMonth / sessionsThisMonth) * 100,
      revenue: revenueThisMonth
    },
    threatIntel: {
      count: threatIntelCount,
      rate: threatIntelCount / 30 // daily average
    },
    topDomains: topDomains // CPP domains with most critical findings
  })
}
```

Frontend (`src/app/admin/page.tsx`):
```tsx
<div className="grid grid-cols-4 gap-4">
  <KPICard title="Sessions (today)" value={analytics.kpis.sessionsToday} />
  <KPICard title="Conversion Rate" value={`${analytics.kpis.conversionRate.toFixed(1)}%`} />
  <KPICard title="Revenue (month)" value={`₹${analytics.kpis.revenue.toLocaleString()}`} />
  <KPICard title="Threat Intel (avg/day)" value={analytics.threatIntel.rate.toFixed(0)} />
</div>

<Chart type="line" data={sessionTrends} title="Sessions Trend" />
<Chart type="funnel" data={conversionFunnel} title="Conversion Funnel" />
```

---

### 8.7: Session Management (Priority 3)

**What to build:**
- All active sessions table
- Force logout button
- Kill stuck session (if idle > 2 hours)
- Concurrent session limit per user (optional)

**Implementation:**

Backend (`src/app/api/admin/sessions/route.ts`):
```typescript
export async function GET(req: Request) {
  const sessions = await db.audit_sessions.findMany({
    where: { status: 'in_progress' }
  })
  
  return Response.json(sessions)
}

export async function DELETE(req: Request) {
  const { sessionId } = await req.json()
  
  await db.audit_sessions.update({
    where: { id: sessionId },
    data: { status: 'abandoned', abandoned_at: new Date() }
  })
}
```

---

### 8.8: Audit Log Export (Priority 3)

**What to build:**
- CSV export of all admin actions
- Session event export (anonymized PII)
- Date range filter
- Compliance report template

**Implementation:**

Backend (`src/app/api/admin/audit-export/route.ts`):
```typescript
export async function GET(req: Request) {
  const { startDate, endDate, entityType } = req.nextUrl.searchParams
  
  const events = await db.admin_actions.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    }
  })
  
  const csv = events.map(e => `${e.admin_id},${e.action_type},${e.entity_id},${e.timestamp}`).join('\n')
  
  return new Response(csv, {
    headers: { 'Content-Type': 'text/csv' }
  })
}
```

---

### 8.9: Webhook Monitoring (Priority 3)

**What to build:**
- RazorPay webhook status
- LinkedIn API health
- Per-webhook retry count
- Failed webhook replay UI

**Implementation:**

Backend (new table):
```sql
CREATE TABLE webhook_logs (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50), -- razorpay, linkedin
  event_type VARCHAR(100),
  payload JSONB,
  status VARCHAR(20), -- success, failed, retrying
  retry_count INT DEFAULT 0,
  error_log TEXT,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

Frontend (`src/app/admin/webhooks/page.tsx`):
```tsx
// Show webhook health per provider
<table>
  <tr>
    <td>RazorPay</td>
    <td>✅ OK</td>
    <td>100 (last 24h)</td>
    <td>0 failed</td>
  </tr>
  <tr>
    <td>LinkedIn</td>
    <td>⚠️ Degraded</td>
    <td>5 (last 24h)</td>
    <td>1 failed <Button>Retry</Button></td>
  </tr>
</table>
```

---

### 8.10: Advanced Search (Priority 3)

**What to build:**
- Global search bar
- Search across: sessions, users, leads, threat intel
- Filters by entity type
- Saved searches (optional)

**Implementation:**

Frontend (`src/app/admin/search/page.tsx`):
```tsx
const [query, setQuery] = useState('')
const [results, setResults] = useState([])

const search = async (q: string) => {
  const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`)
  setResults(await res.json())
}

// Return results grouped by type
// - Sessions (2 results)
// - Users (1 result)
// - Leads (3 results)
```

---

## 🗓️ Phase 8 Timeline

| Week | Tasks | Effort | Status |
|------|-------|--------|--------|
| **Week 1** | 8.1 (Scraper), 8.2 (Threat intel filtering) | 12h | To Do |
| **Week 2** | 8.3 (Leads pipeline), 8.4 (Report queue) | 12h | To Do |
| **Week 3** | 8.5 (LinkedIn OAuth), 8.6 (Analytics) | 10h | To Do |
| **Week 4** | 8.7 (Session mgmt), 8.8 (Audit export), 8.9 (Webhooks) | 10h | To Do |
| **Week 5** | 8.10 (Advanced search), Testing, Documentation | 8h | To Do |

**Total:** ~52 hours (3-5 weeks with other work)

---

## ✅ Acceptance Criteria

### Scraper Health Dashboard
- [ ] Per-source success rate displayed (%)
- [ ] Last run timestamp visible
- [ ] Articles ingested (24h, 7d) shown
- [ ] Error logs clickable
- [ ] Manual trigger button works
- [ ] SSE polling updates in < 2s

### Threat Intel Management
- [ ] Multi-domain filter works
- [ ] Industry tag filter works
- [ ] Date range picker works
- [ ] Bulk delete soft-deletes (audit trail preserved)
- [ ] Used-in-reports flag visible

### Enterprise Leads Pipeline
- [ ] Kanban board displays 4 statuses
- [ ] Drag-drop updates status in DB
- [ ] Email template renders with {company} placeholder
- [ ] Bulk email sends to all selected leads
- [ ] Unlock report sets `enterprise_report_unlocked = true`
- [ ] SLA tracking (time-in-status) accurate

### Report Regeneration Queue
- [ ] Regenerate button enqueues job
- [ ] Progress tracked and displayed
- [ ] Retry count max = 3
- [ ] Exponential backoff works
- [ ] Success/failure notification sent

### LinkedIn OAuth Management
- [ ] Token expiry < 7 days shows warning
- [ ] Refresh token updates `expires_at` in DB
- [ ] Disconnect removes token
- [ ] Rate limit remaining shown

### Analytics Dashboard
- [ ] KPI cards load in < 1s
- [ ] Conversion rate calculated correctly
- [ ] Revenue aggregated by track
- [ ] Charts render correctly
- [ ] Threat intel rate accurate (articles/day)

### Session Management
- [ ] All active sessions listed
- [ ] Force logout marks session abandoned
- [ ] Kill stuck session works (> 2h idle)

### Audit Log Export
- [ ] CSV export downloads
- [ ] Admin actions included
- [ ] Date range filter works
- [ ] PII anonymized

### Webhook Monitoring
- [ ] Per-provider health status displayed
- [ ] Retry count shown
- [ ] Failed webhook replay button works

### Advanced Search
- [ ] Global search bar searches all entities
- [ ] Results grouped by type
- [ ] Filters by entity type work

---

## 🔐 Security Checklist

- [ ] Admin endpoints rate-limited (5 req/s per admin)
- [ ] All admin actions logged with admin_id + timestamp
- [ ] API tokens encrypted in DB
- [ ] CSV export excludes PII
- [ ] Webhook signatures verified
- [ ] Session management prevents concurrent abuse
- [ ] Audit trail immutable (no delete, only soft-delete)

---

## 📚 Documentation

### For This Phase
- [ ] Admin operations guide (how to use each feature)
- [ ] API endpoint documentation
- [ ] Database schema additions
- [ ] Deployment checklist

### Broader
- [ ] Runbook for common admin issues
- [ ] SLA tracking methodology
- [ ] Webhook retry strategy documented

---

## 🚀 Next Phase (Phase 9)

After Phase 8 is complete:
- PWA service worker hardening
- E2E golden path tests (5-10 scenarios)
- Pen test coordination
- Bug bounty program setup
- Landing page copy + compliance statement

---

## 📞 Decision Log

### 1. Async Job Processing
**Decided:** Use APScheduler + in-memory queue for MVP (Celery later if needed)
**Rationale:** Simplicity, no external dependency on Redis/RabbitMQ for Phase 8

### 2. Kanban vs. Table for Leads
**Decided:** Kanban board (drag-drop for status)
**Rationale:** Better UX for sales/ops team managing pipeline; visual progress is key

### 3. Email Template
**Decided:** Pre-written templates + inline edit (not external editor)
**Rationale:** Faster deployment, templates versioned in DB

### 4. Analytics Granularity
**Decided:** Daily snapshots (not real-time)
**Rationale:** Sufficient for admin decisions; reduces DB load

---

## 🎯 Success Criteria (Overall)

Phase 8 is **done** when:
1. ✅ Scraper health visible and actionable
2. ✅ Enterprise leads pipeline flowing (status transitions working)
3. ✅ Report regeneration queued and retried
4. ✅ LinkedIn token management proactive (expiry warnings)
5. ✅ Analytics dashboard shows KPIs at a glance
6. ✅ All admin actions audited and exported
7. ✅ No admin security regressions
8. ✅ Phase 8 acceptance tests pass (100%)
9. ✅ Documentation complete + runbook published

---

**Status:** Planning ✅  
**Next Action:** Create feature branches for 8.1 - 8.10 and assign priorities  
**Review Date:** End of Week 1 (check progress on 8.1 + 8.2)
