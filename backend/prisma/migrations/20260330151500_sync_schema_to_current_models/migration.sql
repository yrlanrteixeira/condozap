-- AlterEnum
ALTER TYPE "ComplaintStatus" ADD VALUE 'RETURNED';
ALTER TYPE "ComplaintStatus" ADD VALUE 'REOPENED';

-- AlterTable
ALTER TABLE "announcements"
ADD COLUMN "expires_at" TIMESTAMP(3),
ADD COLUMN "scope" "MessageScope" NOT NULL DEFAULT 'ALL',
ADD COLUMN "send_whatsapp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "target_floor" TEXT,
ADD COLUMN "target_tower" TEXT,
ADD COLUMN "target_unit" TEXT;

-- AlterTable
ALTER TABLE "complaints"
ADD COLUMN "closed_at" TIMESTAMP(3),
ADD COLUMN "csat_comment" TEXT,
ADD COLUMN "csat_responded_at" TIMESTAMP(3),
ADD COLUMN "csat_score" INTEGER,
ADD COLUMN "last_nudged_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "condominiums"
ADD COLUMN "auto_assign_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "auto_close_after_days" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN "auto_triage_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "reopen_deadline_days" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN "trial_ends_at" TIMESTAMP(3),
ADD COLUMN "waiting_auto_resolve_days" INTEGER NOT NULL DEFAULT 14;

-- AlterTable
ALTER TABLE "user_condominiums" ADD COLUMN "assigned_tower" TEXT;

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "accountExpiresAt" TIMESTAMP(3),
ADD COLUMN "address" TEXT,
ADD COLUMN "contactPhone" TEXT,
ADD COLUMN "officeHours" TEXT,
ADD COLUMN "photoUrl" TEXT,
ADD COLUMN "privateNotes" TEXT,
ADD COLUMN "publicNotes" TEXT,
ADD COLUMN "websiteUrl" TEXT;

-- CreateTable
CREATE TABLE "sector_permissions" (
    "id" TEXT NOT NULL,
    "sector_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sector_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sector_member_permission_overrides" (
    "id" TEXT NOT NULL,
    "sector_member_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sector_member_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_messages" (
    "id" TEXT NOT NULL,
    "complaint_id" INTEGER NOT NULL,
    "sender_id" TEXT NOT NULL,
    "sender_role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachment_url" TEXT,
    "source" TEXT NOT NULL DEFAULT 'WEB',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canned_responses" (
    "id" TEXT NOT NULL,
    "condominium_id" TEXT,
    "sector_id" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canned_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sector_permissions_sector_id_idx" ON "sector_permissions"("sector_id");

-- CreateIndex
CREATE UNIQUE INDEX "sector_permissions_sector_id_action_key" ON "sector_permissions"("sector_id", "action");

-- CreateIndex
CREATE INDEX "sector_member_permission_overrides_sector_member_id_idx" ON "sector_member_permission_overrides"("sector_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "sector_member_permission_overrides_sector_member_id_action_key" ON "sector_member_permission_overrides"("sector_member_id", "action");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "complaint_messages_complaint_id_created_at_idx" ON "complaint_messages"("complaint_id", "created_at");

-- CreateIndex
CREATE INDEX "canned_responses_condominium_id_idx" ON "canned_responses"("condominium_id");

-- CreateIndex
CREATE INDEX "canned_responses_sector_id_idx" ON "canned_responses"("sector_id");

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sector_permissions" ADD CONSTRAINT "sector_permissions_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sector_member_permission_overrides" ADD CONSTRAINT "sector_member_permission_overrides_sector_member_id_fkey" FOREIGN KEY ("sector_member_id") REFERENCES "sector_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_messages" ADD CONSTRAINT "complaint_messages_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_messages" ADD CONSTRAINT "complaint_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canned_responses" ADD CONSTRAINT "canned_responses_condominium_id_fkey" FOREIGN KEY ("condominium_id") REFERENCES "condominiums"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canned_responses" ADD CONSTRAINT "canned_responses_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
