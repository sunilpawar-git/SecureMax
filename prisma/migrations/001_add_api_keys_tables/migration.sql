-- AddTable ApiKey
CREATE TABLE "api_keys" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "key_name_encrypted" TEXT NOT NULL,
  "key_encrypted" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "last_used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rotated_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3)
);

-- CreateIndex ApiKey on provider, status (unique)
CREATE UNIQUE INDEX "api_keys_provider_status_key" ON "api_keys"("provider", "status");

-- CreateIndex ApiKey on provider, status
CREATE INDEX "api_keys_provider_status_idx" ON "api_keys"("provider", "status");

-- AddTable ApiKeyAudit
CREATE TABLE "api_key_audits" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "api_key_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actor" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "status" TEXT NOT NULL DEFAULT 'success',
  "error_msg" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex ApiKeyAudit on api_key_id, created_at
CREATE INDEX "api_key_audits_api_key_id_created_at_idx" ON "api_key_audits"("api_key_id", "created_at");

-- CreateIndex ApiKeyAudit on action, created_at
CREATE INDEX "api_key_audits_action_created_at_idx" ON "api_key_audits"("action", "created_at");
