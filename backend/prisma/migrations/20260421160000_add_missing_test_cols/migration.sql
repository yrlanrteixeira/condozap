-- Sync DB with schema drift: columns referenced by Prisma Client / app code
-- but missing from prior migrations. Idempotent (IF NOT EXISTS).

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "force_password_reset" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "sectors"
  ADD COLUMN IF NOT EXISTS "allowed_forwarding_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
