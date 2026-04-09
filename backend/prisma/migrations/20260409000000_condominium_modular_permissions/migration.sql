-- CreateEnum
CREATE TYPE "CondominiumPermissionMode" AS ENUM ('ROLE_DEFAULT', 'CUSTOM');

-- AlterTable
ALTER TABLE "user_condominiums" ADD COLUMN "permission_mode" "CondominiumPermissionMode" NOT NULL DEFAULT 'ROLE_DEFAULT';

-- CreateTable
CREATE TABLE "user_condominium_permissions" (
    "id" TEXT NOT NULL,
    "user_condominium_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_condominium_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_condominium_permissions_user_condominium_id_action_key" ON "user_condominium_permissions"("user_condominium_id", "action");
CREATE INDEX "user_condominium_permissions_user_condominium_id_idx" ON "user_condominium_permissions"("user_condominium_id");

ALTER TABLE "user_condominium_permissions" ADD CONSTRAINT "user_condominium_permissions_user_condominium_id_fkey" FOREIGN KEY ("user_condominium_id") REFERENCES "user_condominiums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate sector permission actions to canonical keys (aligned with frontend Permissions)
UPDATE "sector_permissions" SET "action" = 'view:complaints' WHERE "action" = 'VIEW_COMPLAINTS';
UPDATE "sector_permissions" SET "action" = 'comment:complaint' WHERE "action" = 'COMMENT';
UPDATE "sector_permissions" SET "action" = 'update:complaint_status' WHERE "action" = 'CHANGE_STATUS';
UPDATE "sector_permissions" SET "action" = 'resolve:complaint' WHERE "action" = 'RESOLVE';
UPDATE "sector_permissions" SET "action" = 'return:complaint' WHERE "action" = 'RETURN';
UPDATE "sector_permissions" SET "action" = 'reassign:complaint' WHERE "action" = 'REASSIGN';

UPDATE "sector_member_permission_overrides" SET "action" = 'view:complaints' WHERE "action" = 'VIEW_COMPLAINTS';
UPDATE "sector_member_permission_overrides" SET "action" = 'comment:complaint' WHERE "action" = 'COMMENT';
UPDATE "sector_member_permission_overrides" SET "action" = 'update:complaint_status' WHERE "action" = 'CHANGE_STATUS';
UPDATE "sector_member_permission_overrides" SET "action" = 'resolve:complaint' WHERE "action" = 'RESOLVE';
UPDATE "sector_member_permission_overrides" SET "action" = 'return:complaint' WHERE "action" = 'RETURN';
UPDATE "sector_member_permission_overrides" SET "action" = 'reassign:complaint' WHERE "action" = 'REASSIGN';
