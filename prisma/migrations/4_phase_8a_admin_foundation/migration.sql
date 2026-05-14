-- Phase 8A: Admin Panel Foundation
-- New models: AdminAction, ScraperRun, FollowUpReminder, WebhookLog
-- Column additions: ThreatIntel.used_in_reports, ReportArtifact.version + previous_id, EnterpriseLead.email + last_email_sent_at + follow_up_due_at

-- AdminAction (immutable audit trail)
CREATE TABLE "admin_actions" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_actions_admin_id_created_at_idx" ON "admin_actions"("admin_id", "created_at");
CREATE INDEX "admin_actions_entity_type_entity_id_idx" ON "admin_actions"("entity_type", "entity_id");

-- ScraperRun (persistent execution history)
CREATE TABLE "scraper_runs" (
    "id" TEXT NOT NULL,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "articles_found" INTEGER NOT NULL DEFAULT 0,
    "articles_stored" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "scraper_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scraper_runs_started_at_idx" ON "scraper_runs"("started_at");

-- FollowUpReminder
CREATE TABLE "follow_up_reminders" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "due_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "follow_up_reminders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "follow_up_reminders_status_due_at_idx" ON "follow_up_reminders"("status", "due_at");

-- WebhookLog
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "error_log" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "webhook_logs_provider_created_at_idx" ON "webhook_logs"("provider", "created_at");

-- ThreatIntel: track if article is referenced in reports
ALTER TABLE "threat_intel" ADD COLUMN "used_in_reports" BOOLEAN NOT NULL DEFAULT false;

-- ReportArtifact: version tracking for regen
ALTER TABLE "report_artifacts" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "report_artifacts" ADD COLUMN "previous_id" TEXT;

-- EnterpriseLead: email, follow-up tracking
ALTER TABLE "enterprise_leads" ADD COLUMN "email" TEXT;
ALTER TABLE "enterprise_leads" ADD COLUMN "last_email_sent_at" TIMESTAMP(3);
ALTER TABLE "enterprise_leads" ADD COLUMN "follow_up_due_at" TIMESTAMP(3);
