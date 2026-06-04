# CLAUDE.md — `ai-service/routers/`

FastAPI route handlers: questionnaire, report, scraper, linkedin. Service-layer pattern.

## Rules

- **All endpoints (except `/health`) require `X-Service-Key` validation** via `ServiceAuthMiddleware`
- **Admin-only routes** (`/scraper/*`, `/linkedin/*`, `/admin/report/*`) — verify admin intent in payload or secondary header
- **`X-User-Id` header** injected by Next.js from server session — treat as trusted; never re-validate against DB on hot path
- **PDF generation uses `BackgroundTasks`** — never block HTTP response for report generation
- **Routers import from `session_repository.py`, `report_repository.py`** — no raw SQL in router files
- **Error responses** use consistent FastAPI `HTTPException` with documented status codes — no bare 500s

## Files

| File | Endpoints |
|------|-----------|
| `questionnaire.py` | `POST /questionnaire/start`, `POST /questionnaire/answer`, `GET /questionnaire/resume`, `POST /questionnaire/abandon` |
| `report.py` | `POST /report/generate`, `GET /report/{job_id}/status`, `GET /report/{job_id}/summary`, `GET /report/{job_id}/full` |
| `scraper.py` | `POST /scraper/run`, `GET /scraper/health`, `GET /scraper/articles` — admin-only |
| `linkedin.py` | `POST /linkedin/draft` — Gemini drafts post from threat intel article IDs |

## Error Handling

```python
# ✓ Correct: consistent HTTPException
from fastapi import HTTPException

try:
  result = await some_operation()
except ValueError as e:
  raise HTTPException(status_code=400, detail=str(e))
except Exception as e:
  logger.error("Unexpected error", extra={"error": str(e)})
  raise HTTPException(status_code=500, detail="Internal server error")
```

## Common Pitfalls

1. Missing `ServiceAuthMiddleware` check → unauthorized API calls
2. Re-validating `X-User-Id` against DB on every request → unnecessary latency
3. Blocking HTTP response for PDF generation → timeout, poor UX
4. Raw SQL in routers → SQL injection risk, hard to test
5. Inconsistent error codes → client can't handle errors reliably
6. Forgetting to inject `X-User-Id` header from Next.js → can't track which user made the request
7. Admin routes without secondary verification → escalation risk
