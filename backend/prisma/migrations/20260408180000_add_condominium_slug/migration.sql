-- AlterTable: slug nullable first for backfill
ALTER TABLE "condominiums" ADD COLUMN "slug" TEXT;

-- Backfill: readable prefix from name + unique suffix (condominium id)
UPDATE "condominiums"
SET "slug" = COALESCE(
    NULLIF(
      trim(both '-' FROM regexp_replace(lower(trim("name")), '[^a-z0-9]+', '-', 'g')),
      ''
    ),
    'condominium'
  ) || '-' || "id";

-- Enforce uniqueness and not null
ALTER TABLE "condominiums" ADD CONSTRAINT "condominiums_slug_key" UNIQUE ("slug");
ALTER TABLE "condominiums" ALTER COLUMN "slug" SET NOT NULL;
