-- Async newsletter generation job tracking (mirrors report_jobs).
-- Next.js on Vercel polls status; synthesis runs on persistent FastAPI.

CREATE TABLE IF NOT EXISTS "newsletter_generation_jobs" (
    "id" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "newsletter_id" TEXT,
    "newsletter_title" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_generation_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "newsletter_generation_jobs_status_idx"
    ON "newsletter_generation_jobs"("status");

ALTER TABLE "newsletter_generation_jobs"
    ADD CONSTRAINT "newsletter_generation_jobs_newsletter_id_fkey"
    FOREIGN KEY ("newsletter_id") REFERENCES "newsletters"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE ON "newsletter_generation_jobs" TO app_user;
GRANT SELECT ON "newsletter_generation_jobs" TO ai_readonly;
GRANT SELECT ON "newsletter_generation_jobs" TO scraper_user;
