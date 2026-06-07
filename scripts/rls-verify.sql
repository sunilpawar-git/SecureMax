\set ON_ERROR_STOP on

-- Minimal stand-ins for the three tenant tables.
CREATE TABLE "audit_sessions" (id text PRIMARY KEY, user_id text NOT NULL);
CREATE TABLE "session_events" (id text PRIMARY KEY, session_id text NOT NULL);
CREATE TABLE "report_artifacts" (id text PRIMARY KEY, session_id text NOT NULL);

-- ----- policies (identical to migration 5_rls_tenant_isolation) -----
ALTER TABLE "audit_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_artifacts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_sessions_tenant_isolation ON "audit_sessions"
  USING (current_setting('app.bypass_rls', true) = 'on'
    OR "user_id" = current_setting('app.current_user_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on'
    OR "user_id" = current_setting('app.current_user_id', true));

CREATE POLICY session_events_tenant_isolation ON "session_events"
  USING (current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (SELECT 1 FROM "audit_sessions" s
      WHERE s.id = "session_events".session_id
        AND s.user_id = current_setting('app.current_user_id', true)));

CREATE POLICY report_artifacts_tenant_isolation ON "report_artifacts"
  USING (current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (SELECT 1 FROM "audit_sessions" s
      WHERE s.id = "report_artifacts".session_id
        AND s.user_id = current_setting('app.current_user_id', true)));

-- ----- seed two tenants -----
INSERT INTO "audit_sessions"(id, user_id) VALUES ('sA','userA'), ('sB','userB');
INSERT INTO "session_events"(id, session_id) VALUES ('eA','sA'), ('eB','sB');
INSERT INTO "report_artifacts"(id, session_id) VALUES ('rA','sA'), ('rB','sB');

-- ----- a non-owner role that is subject to RLS -----
DROP ROLE IF EXISTS rls_app;
CREATE ROLE rls_app NOLOGIN;
GRANT SELECT, INSERT, UPDATE, DELETE ON "audit_sessions","session_events","report_artifacts" TO rls_app;

-- ========== ASSERTIONS ==========
-- (1) Owner bypasses RLS (no FORCE): sees both rows.
DO $$ BEGIN
  IF (SELECT count(*) FROM "audit_sessions") <> 2 THEN
    RAISE EXCEPTION 'FAIL owner-bypass: expected 2 sessions, got %', (SELECT count(*) FROM "audit_sessions");
  END IF;
END $$;

SET ROLE rls_app;

-- (2) No context set -> deny by default (0 rows).
DO $$ BEGIN
  IF (SELECT count(*) FROM "audit_sessions") <> 0 THEN
    RAISE EXCEPTION 'FAIL no-context: expected 0 sessions, got %', (SELECT count(*) FROM "audit_sessions");
  END IF;
END $$;

-- (3) userA context -> sees only its own session/event/artifact.
SET app.current_user_id = 'userA';
DO $$ BEGIN
  IF (SELECT count(*) FROM "audit_sessions") <> 1
     OR (SELECT min(id) FROM "audit_sessions") <> 'sA' THEN
    RAISE EXCEPTION 'FAIL userA sessions isolation';
  END IF;
  IF (SELECT count(*) FROM "session_events") <> 1
     OR (SELECT min(id) FROM "session_events") <> 'eA' THEN
    RAISE EXCEPTION 'FAIL userA events isolation';
  END IF;
  IF (SELECT count(*) FROM "report_artifacts") <> 1
     OR (SELECT min(id) FROM "report_artifacts") <> 'rA' THEN
    RAISE EXCEPTION 'FAIL userA artifacts isolation';
  END IF;
END $$;

-- (4) userA cannot write a row owned by userB (WITH CHECK).
DO $$ BEGIN
  BEGIN
    INSERT INTO "audit_sessions"(id, user_id) VALUES ('sX','userB');
    RAISE EXCEPTION 'FAIL with-check: cross-tenant insert was allowed';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- expected: RLS WITH CHECK violation
  END;
END $$;

-- (5) bypass context -> sees everything (admin/service path).
SET app.bypass_rls = 'on';
DO $$ BEGIN
  IF (SELECT count(*) FROM "audit_sessions") <> 2 THEN
    RAISE EXCEPTION 'FAIL bypass: expected 2 sessions, got %', (SELECT count(*) FROM "audit_sessions");
  END IF;
END $$;

RESET app.bypass_rls;
RESET app.current_user_id;
RESET ROLE;

SELECT 'ALL RLS ASSERTIONS PASSED' AS result;
