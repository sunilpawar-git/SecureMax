-- Store question graph version on AuditSession for historical replay
ALTER TABLE "audit_sessions" ADD COLUMN "graph_version" TEXT;
