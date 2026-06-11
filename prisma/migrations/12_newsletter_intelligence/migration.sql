-- Add 7 intelligence scoring columns to threat_intel
-- (gatekeeper scores from Phase 1A/1B of the newsletter intelligence sprint)
ALTER TABLE "threat_intel"
  ADD COLUMN IF NOT EXISTS "physical_security_relevance" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS "geographic_relevance"        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS "threat_actionability"        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS "educational_value"           DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS "recency_novelty"             DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS "audience_impact"             DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS "affected_segments"           JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add 7 multi-format / tiered-content columns to newsletters
-- (email HTML, WhatsApp text, website HTML, and tiered prose from Phase 4/5)
ALTER TABLE "newsletters"
  ADD COLUMN IF NOT EXISTS "email_html"            TEXT,
  ADD COLUMN IF NOT EXISTS "whatsapp_text"         TEXT,
  ADD COLUMN IF NOT EXISTS "website_html"          TEXT,
  ADD COLUMN IF NOT EXISTS "executive_summary"     TEXT,
  ADD COLUMN IF NOT EXISTS "intelligence_briefing" TEXT,
  ADD COLUMN IF NOT EXISTS "full_analysis"         TEXT,
  ADD COLUMN IF NOT EXISTS "commanders_note"       TEXT;

-- Backfill: existing rows carry relevance_score = 0.5 from the pre-sprint
-- single-score tagger. The new quality gate threshold is 0.6, so they would
-- all be excluded from newsletter drafting. Promote them to 0.6 (minimum
-- passing score) so they remain eligible. Future rescrapings will set the
-- real composite score via ON CONFLICT DO UPDATE (see pipeline.py).
UPDATE "threat_intel"
SET "relevance_score" = 0.6
WHERE "relevance_score" = 0.5;

-- GRANTs: new columns inherit the existing table-level grants from
-- migration 11_add_newsletters. No new statements required.
