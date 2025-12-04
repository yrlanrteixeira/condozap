-- AlterTable
ALTER TABLE "residents" ADD COLUMN     "email" TEXT NOT NULL DEFAULT 'pendente@condozap.com';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "consent_data_processing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consent_whatsapp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requested_phone" TEXT;

-- CreateIndex
CREATE INDEX "residents_condominium_id_email_idx" ON "residents"("condominium_id", "email");
