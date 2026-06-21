-- Row-Level Security: per-tenant isolation on user-owned tables.
--
-- Policies key on the `app.current_user_id` GUC (set per request inside a
-- transaction by withUserContext), with an `app.bypass_rls` escape hatch for
-- admin/service paths (withRlsBypass). This model is portable: it does NOT
-- depend on Supabase Auth (`auth.uid()`), so it works identically on
-- self-hosted Postgres and Supabase.
--
-- IMPORTANT: RLS is ENABLED but NOT FORCED. The table owner / superuser role
-- bypasses RLS, so the current owner connection is unaffected. Enforcement
-- activates once the application connects via a NON-owner role that lacks the
-- BYPASSRLS attribute (the Supabase migration target). Grant that role
-- SELECT/INSERT/UPDATE/DELETE on these tables.

ALTER TABLE "audit_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_artifacts" ENABLE ROW LEVEL SECURITY;

-- audit_sessions — direct ownership via user_id.
DROP POLICY IF EXISTS audit_sessions_tenant_isolation ON "audit_sessions";
CREATE POLICY audit_sessions_tenant_isolation ON "audit_sessions"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "user_id" = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "user_id" = current_setting('app.current_user_id', true)
  );

-- session_events — ownership inherited from the parent audit_sessions row.
DROP POLICY IF EXISTS session_events_tenant_isolation ON "session_events";
CREATE POLICY session_events_tenant_isolation ON "session_events"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM "audit_sessions" s
      WHERE s.id = "session_events".session_id
        AND s.user_id = current_setting('app.current_user_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM "audit_sessions" s
      WHERE s.id = "session_events".session_id
        AND s.user_id = current_setting('app.current_user_id', true)
    )
  );

-- report_artifacts — ownership inherited from the parent audit_sessions row.
DROP POLICY IF EXISTS report_artifacts_tenant_isolation ON "report_artifacts";
CREATE POLICY report_artifacts_tenant_isolation ON "report_artifacts"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM "audit_sessions" s
      WHERE s.id = "report_artifacts".session_id
        AND s.user_id = current_setting('app.current_user_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM "audit_sessions" s
      WHERE s.id = "report_artifacts".session_id
        AND s.user_id = current_setting('app.current_user_id', true)
    )
  );
