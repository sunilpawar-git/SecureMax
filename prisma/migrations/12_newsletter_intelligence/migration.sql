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

-- Backfill: the pre-sprint keyword tagger produced scores of 0, 0.15, 0.30,
-- 0.45 (step-function based on keyword hit count). The new quality gate
-- threshold is 0.6, so all of these would be excluded from newsletter
-- drafting. Promote any row below threshold to 0.6 (minimum passing score)
-- so the existing corpus remains eligible. Future rescrapings will overwrite
-- these with real composite scores via ON CONFLICT DO UPDATE (see
-- pipeline.py).
-- relevance_score is added in migration 3 (lexicographic order runs after 12).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'threat_intel'
      AND column_name = 'relevance_score'
  ) THEN
    UPDATE "threat_intel"
    SET "relevance_score" = 0.6
    WHERE "relevance_score" < 0.6;
  END IF;
END $$;

-- GRANTs: new columns inherit the existing table-level grants from
-- migration 11_add_newsletters. No new statements required.
