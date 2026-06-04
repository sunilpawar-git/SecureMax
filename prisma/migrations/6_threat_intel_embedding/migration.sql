-- Add embedding column to threat_intel for semantic search over scraped articles
ALTER TABLE "threat_intel" ADD COLUMN "embedding" vector(3072);

-- Partial index: only index rows that have been embedded
CREATE INDEX idx_threat_intel_embedding ON "threat_intel"
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 10)
    WHERE embedding IS NOT NULL;
