-- Migration: Add standalone UNIQUE constraint on threat_intel.content_hash
-- Previously only a composite unique (url, content_hash) existed.
-- The dedup query uses OR (url = $1 OR content_hash = $2), so each column
-- must be independently unique for the guarantee to hold at DB level.

-- Drop composite unique index if it exists (safe: no data depends on it)
DROP INDEX IF EXISTS "threat_intel_url_content_hash_key";

-- Add standalone unique on content_hash
ALTER TABLE "threat_intel"
  ADD CONSTRAINT "threat_intel_content_hash_key" UNIQUE (content_hash);
