-- CreateTable
CREATE TABLE "newsletters" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body_markdown" TEXT NOT NULL,
    "image_png" BYTEA,
    "article_ids" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_posts" (
    "id" TEXT NOT NULL,
    "newsletter_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "external_id" TEXT,
    "error_msg" TEXT,
    "posted_at" TIMESTAMP(3),
    "posted_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "newsletters_status_created_at_idx" ON "newsletters"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_posts_newsletter_id_platform_key" ON "newsletter_posts"("newsletter_id", "platform");

-- CreateIndex
CREATE INDEX "newsletter_posts_status_idx" ON "newsletter_posts"("status");

-- AddForeignKey
ALTER TABLE "newsletter_posts" ADD CONSTRAINT "newsletter_posts_newsletter_id_fkey" FOREIGN KEY ("newsletter_id") REFERENCES "newsletters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Role-based access control (mirrors pattern from other tables)
GRANT SELECT, INSERT, UPDATE ON "newsletters" TO app_user;
GRANT SELECT ON "newsletters" TO ai_readonly;
GRANT SELECT ON "newsletters" TO scraper_user;

GRANT SELECT, INSERT, UPDATE ON "newsletter_posts" TO app_user;
GRANT SELECT ON "newsletter_posts" TO ai_readonly;
GRANT SELECT ON "newsletter_posts" TO scraper_user;
