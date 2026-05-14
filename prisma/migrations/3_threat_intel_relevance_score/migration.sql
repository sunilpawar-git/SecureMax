-- Migration: Add relevance_score column to threat_intel
-- Previously populated in ProcessedArticle but never persisted.
-- Enables future article ranking and filtering by relevance.

ALTER TABLE "threat_intel"
  ADD COLUMN IF NOT EXISTS "relevance_score" FLOAT NOT NULL DEFAULT 0.0;
