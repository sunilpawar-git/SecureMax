-- Coupon code system for pilot-client free report unlocks.
-- Expiry is derived from expires_at at read/redeem time; status only tracks
-- actor-driven lifecycle transitions (redeem/revoke).

CREATE TYPE "coupon_status" AS ENUM ('ACTIVE', 'REDEEMED', 'REVOKED');

CREATE TABLE "coupon_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "redeemed_by_id" TEXT,
    "session_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "redeemed_at" TIMESTAMP(3),
    "status" "coupon_status" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "coupon_codes_code_key" ON "coupon_codes"("code");
CREATE UNIQUE INDEX "coupon_codes_session_id_key" ON "coupon_codes"("session_id");
CREATE INDEX "coupon_codes_status_idx" ON "coupon_codes"("status");

ALTER TABLE "coupon_codes" ADD CONSTRAINT "coupon_codes_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupon_codes" ADD CONSTRAINT "coupon_codes_redeemed_by_id_fkey"
    FOREIGN KEY ("redeemed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "coupon_codes" ADD CONSTRAINT "coupon_codes_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "audit_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Auto-generated pilot coupon shown on the enterprise lead card
ALTER TABLE "enterprise_leads" ADD COLUMN "coupon_code" TEXT;
