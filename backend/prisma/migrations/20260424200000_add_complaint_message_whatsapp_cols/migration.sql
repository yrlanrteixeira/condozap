-- Sync DB with schema: complaint_messages references whatsapp_status /
-- whatsapp_message_id in Prisma but they were missing from prior migrations.
-- Idempotent (IF NOT EXISTS) so it is safe on environments that already added
-- the columns out-of-band.

ALTER TABLE "complaint_messages"
  ADD COLUMN IF NOT EXISTS "whatsapp_status" TEXT,
  ADD COLUMN IF NOT EXISTS "whatsapp_message_id" TEXT;
