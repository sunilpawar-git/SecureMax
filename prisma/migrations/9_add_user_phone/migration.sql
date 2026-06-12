-- Add optional phone field to users (digits-only E.164, no '+') for HNI follow-up WhatsApp CTA
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
