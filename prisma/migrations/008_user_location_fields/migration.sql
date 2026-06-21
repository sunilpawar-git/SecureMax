-- Add city and country fields to users table for location-aware audit context
ALTER TABLE "users" ADD COLUMN "city" TEXT;
ALTER TABLE "users" ADD COLUMN "country" TEXT;
