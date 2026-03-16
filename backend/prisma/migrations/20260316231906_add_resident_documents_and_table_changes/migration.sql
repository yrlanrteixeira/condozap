/*
  Warnings:

  - You are about to drop the column `working_hours` on the `sla_config` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "complaints" DROP CONSTRAINT "complaints_resolved_by_fkey";

-- DropIndex
DROP INDEX "complaint_attachments_complaint_id_idx";

-- DropIndex
DROP INDEX "complaint_status_history_complaint_id_idx";

-- AlterTable
ALTER TABLE "complaints" ALTER COLUMN "status" SET DEFAULT 'TRIAGE';

-- AlterTable
ALTER TABLE "residents" ALTER COLUMN "consent_whatsapp" SET DEFAULT true,
ALTER COLUMN "consent_data_processing" SET DEFAULT true;

-- AlterTable
ALTER TABLE "sectors" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sla_config" DROP COLUMN "working_hours",
ADD COLUMN     "workingHours" JSONB,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "consent_data_processing" SET DEFAULT true,
ALTER COLUMN "consent_whatsapp" SET DEFAULT true;

-- CreateTable
CREATE TABLE "resident_documents" (
    "id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "number" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "observation" TEXT,
    "file_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resident_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resident_documents_resident_id_status_idx" ON "resident_documents"("resident_id", "status");

-- AddForeignKey
ALTER TABLE "resident_documents" ADD CONSTRAINT "resident_documents_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
