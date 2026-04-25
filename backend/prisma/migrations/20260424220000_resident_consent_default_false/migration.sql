-- LGPD: change consent_whatsapp default to FALSE so opt-in is explicit.
-- Existing rows are NOT modified — only the default for new rows changes.
-- Idempotent: safe to re-run.
ALTER TABLE "residents" ALTER COLUMN "consent_whatsapp" SET DEFAULT false;
