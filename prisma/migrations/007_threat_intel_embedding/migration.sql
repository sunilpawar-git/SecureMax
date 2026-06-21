-- Add embedding column to threat_intel for semantic search over scraped articles
ALTER TABLE "threat_intel" ADD COLUMN "embedding" vector(3072);

-- No index: pgvector only supports up to 2000 dims for ivfflat/hnsw;
-- vector(3072) (Gemini) uses sequential scan, acceptable for threat_intel table size.
