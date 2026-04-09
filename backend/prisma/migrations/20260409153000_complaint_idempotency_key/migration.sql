ALTER TABLE "complaints"
ADD COLUMN IF NOT EXISTS "request_key" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "complaints_resident_id_condominium_id_request_key_key"
ON "complaints"("resident_id", "condominium_id", "request_key");
