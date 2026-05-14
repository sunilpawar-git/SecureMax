-- AddTable ReportJob — async report generation status tracking
CREATE TABLE IF NOT EXISTS "report_jobs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "session_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_jobs_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "audit_sessions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex ReportJob session_id unique
CREATE UNIQUE INDEX "report_jobs_session_id_key" ON "report_jobs"("session_id");

-- CreateIndex ReportJob on status
CREATE INDEX "report_jobs_status_idx" ON "report_jobs"("status");
