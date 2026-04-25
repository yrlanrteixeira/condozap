-- Change Complaint.resident FK from ON DELETE CASCADE to ON DELETE RESTRICT.
-- This prevents accidental loss of the complaint history when a resident
-- is deleted (the service layer also blocks this with a friendly 409, but
-- Restrict is a defense-in-depth invariant for raw SQL / accidental paths).

ALTER TABLE "complaints"
  DROP CONSTRAINT IF EXISTS "complaints_resident_id_fkey";

ALTER TABLE "complaints"
  ADD CONSTRAINT "complaints_resident_id_fkey"
  FOREIGN KEY ("resident_id")
  REFERENCES "residents"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
