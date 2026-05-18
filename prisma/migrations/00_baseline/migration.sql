-- Baseline migration: core schema that was initially created via `prisma db push`.
-- Subsequent numbered migrations (0_add_api_keys_tables, 1_add_report_jobs, etc.)
-- depend on these tables existing. All statements use IF NOT EXISTS so this is
-- safe to apply against an existing database.

-- pgvector extension (required for cpp_chunks.embedding)
CREATE EXTENSION IF NOT EXISTS vector;

-- ========== USERS ==========

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "image" TEXT,
  "role" TEXT NOT NULL DEFAULT 'user',
  "track" TEXT NOT NULL DEFAULT 'hni',
  "org_name" TEXT,
  "logo_url" TEXT,
  "consent_at" TIMESTAMP(3),
  "consent_version" TEXT,
  "consent_purpose" TEXT,
  "anonymised_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- ========== NEXTAUTH ACCOUNTS ==========

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_account_id" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- ========== NEXTAUTH SESSIONS ==========

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT NOT NULL,
  "session_token" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "sessions_session_token_key" ON "sessions"("session_token");

-- ========== NEXTAUTH VERIFICATION TOKENS ==========

CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- ========== AUDIT SESSIONS ==========

CREATE TABLE IF NOT EXISTS "audit_sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "track" TEXT NOT NULL DEFAULT 'hni',
  "status" TEXT NOT NULL DEFAULT 'in_progress',
  "property_type" TEXT,
  "facility_type" TEXT,
  "current_node_id" TEXT,
  "domain_scores" JSONB,
  "module_scores" JSONB,
  "paid" BOOLEAN NOT NULL DEFAULT false,
  "razorpay_order_id" TEXT,
  "nda_accepted_at" TIMESTAMP(3),
  "report_ready" BOOLEAN NOT NULL DEFAULT false,
  "enterprise_report_unlocked" BOOLEAN NOT NULL DEFAULT false,
  "post_download_followup_at" TIMESTAMP(3),
  "downloaded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "audit_sessions_razorpay_order_id_key" ON "audit_sessions"("razorpay_order_id");
CREATE INDEX IF NOT EXISTS "audit_sessions_user_id_status_idx" ON "audit_sessions"("user_id", "status");

-- ========== SESSION EVENTS (immutable audit trail) ==========

CREATE TABLE IF NOT EXISTS "session_events" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "question_node_id" TEXT NOT NULL,
  "answer_encrypted" TEXT NOT NULL,
  "ai_reasoning_encrypted" TEXT,
  "cpp_citations" JSONB,
  "compliance_tags" JSONB,
  "domain_score_delta" JSONB,
  "module_score_delta" JSONB,
  "anonymised_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "session_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "session_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "audit_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "session_events_session_id_question_node_id_key" ON "session_events"("session_id", "question_node_id");
CREATE INDEX IF NOT EXISTS "session_events_session_id_idx" ON "session_events"("session_id");

-- ========== QUESTION NODES ==========

CREATE TABLE IF NOT EXISTS "question_nodes" (
  "id" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "question_type" TEXT NOT NULL,
  "edges" JSONB NOT NULL,
  "cpp_domain_tag" TEXT NOT NULL,
  "track" TEXT NOT NULL DEFAULT 'both',
  "module_tag" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "is_terminal" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "question_nodes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "question_nodes_track_domain_idx" ON "question_nodes"("track", "domain");

-- ========== CPP CHUNKS (pgvector embeddings) ==========

CREATE TABLE IF NOT EXISTS "cpp_chunks" (
  "id" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "chunk_text" TEXT NOT NULL,
  "embedding" vector(3072) NOT NULL,
  "content_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cpp_chunks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cpp_chunks_content_hash_key" ON "cpp_chunks"("content_hash");
CREATE INDEX IF NOT EXISTS "cpp_chunks_domain_idx" ON "cpp_chunks"("domain");

-- ========== THREAT INTEL ==========
-- Note: content_hash gets a standalone UNIQUE constraint in migration 2.
-- relevance_score column is added in migration 3.
-- used_in_reports column is added in migration 4.

CREATE TABLE IF NOT EXISTS "threat_intel" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "content_hash" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "domain_tags" JSONB NOT NULL,
  "industry_tags" JSONB NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'unknown',
  "soft_deleted" BOOLEAN NOT NULL DEFAULT false,
  "scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "threat_intel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "threat_intel_url_key" ON "threat_intel"("url");
CREATE INDEX IF NOT EXISTS "threat_intel_soft_deleted_idx" ON "threat_intel"("soft_deleted");

-- ========== LINKEDIN POSTS ==========

CREATE TABLE IF NOT EXISTS "linkedin_posts" (
  "id" TEXT NOT NULL,
  "draft_text" TEXT NOT NULL,
  "final_text" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "posted_at" TIMESTAMP(3),
  "platform" TEXT NOT NULL DEFAULT 'linkedin',
  "posted_by_admin_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "linkedin_posts_pkey" PRIMARY KEY ("id")
);

-- ========== REPORT ARTIFACTS ==========
-- Note: version and previous_id columns are added in migration 4.

CREATE TABLE IF NOT EXISTS "report_artifacts" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "pdf_encrypted" BYTEA NOT NULL,
  "audit_urgency_score" INTEGER NOT NULL,
  "peer_benchmark_percentile" DOUBLE PRECISION NOT NULL,
  "compliance_gap_count" INTEGER,
  "findings_json" JSONB,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_artifacts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "report_artifacts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "audit_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "report_artifacts_session_id_key" ON "report_artifacts"("session_id");

-- ========== ENTERPRISE LEADS ==========
-- Note: email, last_email_sent_at, follow_up_due_at columns are added in migration 4.

CREATE TABLE IF NOT EXISTS "enterprise_leads" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "designation" TEXT,
  "company" TEXT NOT NULL,
  "facilities_count" INTEGER,
  "cities" TEXT,
  "preferred_contact" TEXT,
  "source_session_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enterprise_leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "enterprise_leads_status_idx" ON "enterprise_leads"("status");
