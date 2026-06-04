# AI Service — Database Safety & Operations

This document details database access control, role permissions, and operational safeguards for the FastAPI AI service.

## Database Architecture

Single PostgreSQL database (`security_crawler`) with role-based access control (RBAC).

**Database**: `postgresql://localhost:5432/security_crawler`

### Tables Overview

| Table | Purpose | Read By | Written By |
|-------|---------|---------|-----------|
| **cpp_chunks** | CPP Seven Precis embeddings (knowledge base) | all roles | app_user (seeding) |
| **threat_intel** | Security threats from scraper | all roles | scraper_user |
| **audit_sessions** | Questionnaire sessions | all roles | app_user |
| **session_events** | Encrypted answers + AI reasoning | all roles | app_user |
| **report_artifacts** | Generated PDF reports (encrypted) | app_user | app_user |
| **linkedin_posts** | Admin social media log | all roles | app_user |
| **api_keys** | Encrypted third-party credentials | app_user only | app_user |

---

## Role-Based Access Control

### 1. **ai_readonly** — Claude AI (SELECT only)

```
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ai_readonly;
```

**Used by**: Claude AI in Claude Code, analytics scripts

**Permissions**:
- SELECT from all tables (cpp_chunks, threat_intel, audit_sessions, etc.)
- Cannot INSERT, UPDATE, DELETE, DROP
- Cannot see api_keys

**Environment variable**: `DATABASE_READ_URL`

**Connection string**:
```
postgresql://ai_readonly:secure_ai_readonly_2024@localhost:5432/security_crawler
```

### 2. **app_user** — FastAPI Application (read + audit writes)

```
GRANT SELECT ON ALL TABLES;
GRANT INSERT, UPDATE ON audit_sessions, session_events, report_artifacts, cpp_chunks;
GRANT INSERT ON linkedin_posts;
```

**Used by**: FastAPI service (all routes)

**Permissions**:
- SELECT from all tables (read for branching, threat context, etc.)
- INSERT/UPDATE on audit sessions and reports
- Can INSERT new cpp_chunks (seeding)
- Can read api_keys (for Gemini, LinkedIn auth)
- Cannot DELETE any table
- Cannot touch threat_intel

**Environment variable**: `DATABASE_WRITE_URL`

**Connection string**:
```
postgresql://app_user:secure_app_2024@localhost:5432/security_crawler
```

### 3. **scraper_user** — Playwright Scraper (threat_intel writes)

```
GRANT SELECT ON ALL TABLES;
GRANT INSERT, UPDATE, DELETE ON threat_intel;
```

**Used by**: `ai-service/routers/scraper.py`, Playwright scraper

**Permissions**:
- SELECT from all tables (to check for duplicates, what was posted)
- INSERT/UPDATE/DELETE on threat_intel only
- Cannot touch cpp_chunks, audit_sessions, api_keys
- Cannot see api_keys

**Environment variable**: `SCRAPER_DATABASE_URL`

**Connection string**:
```
postgresql://scraper_user:secure_scraper_2024@localhost:5432/security_crawler
```

### 4. **db_admin** — Database Administrator (full access)

**Used by**: Emergency operations, migrations, backups

**Permissions**: ALL on all tables

**Connection string**:
```
postgresql://db_admin:secure_admin_password@localhost:5432/security_crawler
```

*Keep credentials secure. Only used for emergencies.*

---

## Configuration

### Environment Variables (`.env`)

```bash
# Read-only (SELECT only)
DATABASE_READ_URL="postgresql://ai_readonly:secure_ai_readonly_2024@localhost:5432/security_crawler"

# App writes (INSERT/UPDATE on audit tables)
DATABASE_WRITE_URL="postgresql://app_user:secure_app_2024@localhost:5432/security_crawler"

# Scraper writes (INSERT/UPDATE/DELETE on threat_intel)
SCRAPER_DATABASE_URL="postgresql://scraper_user:secure_scraper_2024@localhost:5432/security_crawler"

# Fallback (uses app_user credentials)
DATABASE_URL="postgresql://app_user:secure_app_2024@localhost:5432/security_crawler"
```

### Python Configuration (`config.py`)

```python
from config import get_settings

settings = get_settings()

# Use for SELECT queries
read_url = settings.get_read_url()

# Use for INSERT/UPDATE queries
write_url = settings.get_write_url()

# Use for scraper operations
scraper_url = settings.get_scraper_url()
```

---

## Operational Safeguards

### 1. Accidental Deletion Prevention

**All database deletion operations are prohibited for AI (Claude Code)**:
- Cannot run `DELETE FROM ...` via shell
- Cannot run `DROP TABLE`, `TRUNCATE`
- Cannot run `git reset --hard`, `rm -rf`

These are blocked by `.claude/settings.json` permission rules.

### 2. Audit Logging

PostgreSQL audit logging enabled (`pgaudit` extension):
- All DDL (CREATE, ALTER, DROP) logged
- All DML (INSERT, UPDATE, DELETE) logged
- Failed queries logged

View logs:
```bash
psql -d security_crawler -c "SELECT * FROM pg_catalog.pg_logging_log ORDER BY logged DESC LIMIT 50;"
```

### 3. Automated Backups

Hourly backups to `/backups/`:
```bash
pg_dump security_crawler | gzip > /backups/security_crawler_$(date +%Y%m%d_%H%M%S).sql.gz
```

Restore from backup:
```bash
gunzip < /backups/security_crawler_20260604_120000.sql.gz | psql security_crawler
```

### 4. Data Immutability

Session events (`session_events` table) are append-only:
- Answers and AI reasoning AES-encrypted before insertion
- No UPDATE or DELETE allowed on existing events
- Timestamp recorded at insert time
- Provides audit trail for compliance

---

## Development Workflow

### Seeding CPP Chunks (Knowledge Base)

```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Dry run (no DB writes)
python scripts/seed_cpp_embeddings_md_sync.py --dry-run

# Full seed (embeds via Gemini, inserts to DB)
python scripts/seed_cpp_embeddings_md_sync.py
```

Uses `app_user` role (has INSERT permission on cpp_chunks).

### Seeding Question Graph

```bash
cd ai-service
python scripts/seed_question_graph.py
```

Reads from `../question-graph/*.yaml`, validates, inserts to `question_nodes`.

### Running Scraper Manually

```bash
# Runs as scraper_user, can only write to threat_intel
curl -X POST http://localhost:8000/admin/scrape \
  -H "X-Service-Key: your-key" \
  -H "Content-Type: application/json"
```

---

## Emergency Procedures

### Recover Deleted Data

If accidental deletion occurs:

```bash
# List available backups
ls -lh /backups/

# Restore entire database
gunzip < /backups/security_crawler_TIMESTAMP.sql.gz | psql security_crawler

# Or restore specific table from backup
pg_restore --table=cpp_chunks /backups/backup.dump | psql security_crawler
```

### Grant Emergency Access

Only if absolutely necessary:

```sql
-- Connect as db_admin
psql -U db_admin -d security_crawler

-- Temporarily grant DELETE to app_user (emergency only)
GRANT DELETE ON cpp_chunks TO app_user;

-- Revoke after emergency
REVOKE DELETE ON cpp_chunks FROM app_user;
```

### View Audit Log

```bash
# Show all DELETE operations
psql -d security_crawler -c \
  "SELECT usename, statement, statement_timestamp FROM pg_audit_log WHERE statement LIKE 'DELETE%' ORDER BY statement_timestamp DESC LIMIT 20;"
```

---

## Testing

### Test Database Isolation

Verify role permissions work:

```python
# Test read-only role cannot delete
import asyncpg

async def test_read_only_safety():
    settings = get_settings()
    url = settings.get_read_url()
    conn = await asyncpg.connect(url)
    
    try:
        # This should fail (permission denied)
        await conn.execute("DELETE FROM threat_intel WHERE id = $1", "test-id")
        assert False, "Should not reach here"
    except asyncpg.PostgresError as e:
        assert "permission denied" in str(e).lower()
    finally:
        await conn.close()
```

### Verify Scraper Can Only Write threat_intel

```python
async def test_scraper_permissions():
    settings = get_settings()
    url = settings.get_scraper_url()
    conn = await asyncpg.connect(url)
    
    # Should work
    await conn.execute(
        "INSERT INTO threat_intel (title, url) VALUES ($1, $2)",
        "Test threat", "http://example.com"
    )
    
    # Should fail (no INSERT on cpp_chunks)
    try:
        await conn.execute(
            "INSERT INTO cpp_chunks (domain, section, chunk_text, embedding, content_hash) VALUES ($1, $2, $3, $4, $5)",
            "CPP-01", "test", "test", "[0]", "hash"
        )
        assert False, "Should not reach here"
    except asyncpg.PostgresError as e:
        assert "permission denied" in str(e).lower()
    finally:
        await conn.close()
```

---

## Troubleshooting

### Connection Refused

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Start if needed
brew services start postgresql@15
```

### Permission Denied (for specific table)

```bash
# Check role grants
psql -d security_crawler -c "SELECT grantee, privilege_type FROM role_table_grants WHERE table_name = 'cpp_chunks';"
```

### Role Does Not Exist

Re-create roles:

```bash
psql -d security_crawler < ai-service/scripts/setup_roles.sql
```

---

## References

- **PostgreSQL Roles**: https://www.postgresql.org/docs/current/user-manag.html
- **Row-Level Security**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Audit Logging**: https://www.pgaudit.org/
- **Backup/Restore**: https://www.postgresql.org/docs/current/backup.html
