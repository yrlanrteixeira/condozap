-- Create activity_logs table and ActivityType enum.
-- Drift: the model existed in schema.prisma but was never migrated, so any
-- handler calling createActivityLog hit a runtime 500 ("relation does not exist").

DO $$ BEGIN
    CREATE TYPE "ActivityType" AS ENUM (
        'MESSAGE_SENT',
        'MESSAGE_FAILED',
        'COMPLAINT_STATUS_CHANGED',
        'COMPLAINT_CREATED',
        'RESIDENT_CREATED',
        'RESIDENT_UPDATED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "activity_logs" (
    "id" TEXT NOT NULL,
    "condominium_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT,
    "type" "ActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "target_id" TEXT,
    "target_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "activity_logs_condominium_id_created_at_idx"
    ON "activity_logs"("condominium_id", "created_at");
CREATE INDEX IF NOT EXISTS "activity_logs_type_idx"
    ON "activity_logs"("type");
CREATE INDEX IF NOT EXISTS "activity_logs_user_id_idx"
    ON "activity_logs"("user_id");
