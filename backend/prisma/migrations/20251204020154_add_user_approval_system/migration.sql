-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "requested_condominium_id" TEXT,
ADD COLUMN     "requested_floor" TEXT,
ADD COLUMN     "requested_tower" TEXT,
ADD COLUMN     "requested_unit" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_requested_condominium_id_idx" ON "users"("requested_condominium_id");
