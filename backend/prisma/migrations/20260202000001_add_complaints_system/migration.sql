-- ============================================================
-- MIGRATION: Sistema Completo de Chamados
-- Created at: 2026-02-02
-- Description: Add comprehensive complaints system with sectors, SLA, and assignments
-- ============================================================

-- ============================================================
-- STEP 1: CREATE TABLES
-- ============================================================

-- Table: sectors
CREATE TABLE IF NOT EXISTS "sectors" (
    "id" TEXT NOT NULL,
    "condominium_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categories" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- Table: sector_members
CREATE TABLE IF NOT EXISTS "sector_members" (
    "id" TEXT NOT NULL,
    "sector_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "workload" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sector_members_pkey" PRIMARY KEY ("id")
);

-- Table: complaints
CREATE TABLE IF NOT EXISTS "complaints" (
    "id" SERIAL NOT NULL,
    "condominium_id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "sector_id" TEXT,
    "assignee_id" TEXT,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'TRIAGE',
    "priority" "ComplaintPriority" NOT NULL DEFAULT 'MEDIUM',
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "response_due_at" TIMESTAMP(3),
    "resolution_due_at" TIMESTAMP(3),
    "response_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "paused_until" TIMESTAMP(3),
    "pause_reason" TEXT,
    "escalated_at" TIMESTAMP(3),
    "escalation_target_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- Garantir colunas em complaints (tabela pode já existir da migração init)
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "sector_id" TEXT;
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "assignee_id" TEXT;
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "response_due_at" TIMESTAMP(3);
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "resolution_due_at" TIMESTAMP(3);
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "response_at" TIMESTAMP(3);
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "paused_until" TIMESTAMP(3);
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "pause_reason" TEXT;
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "escalated_at" TIMESTAMP(3);
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "escalation_target_id" TEXT;

-- Table: complaint_attachments
CREATE TABLE IF NOT EXISTS "complaint_attachments" (
    "id" TEXT NOT NULL,
    "complaint_id" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "complaint_attachments_pkey" PRIMARY KEY ("id")
);

-- Table: complaint_status_history
CREATE TABLE IF NOT EXISTS "complaint_status_history" (
    "id" TEXT NOT NULL,
    "complaint_id" INTEGER NOT NULL,
    "from_status" "ComplaintStatus",
    "to_status" "ComplaintStatus",
    "changed_by" TEXT NOT NULL,
    "notes" TEXT,
    "action" TEXT NOT NULL DEFAULT 'STATUS_CHANGE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "complaint_status_history_pkey" PRIMARY KEY ("id")
);

-- Table: complaint_assignments
CREATE TABLE IF NOT EXISTS "complaint_assignments" (
    "id" TEXT NOT NULL,
    "complaint_id" INTEGER NOT NULL,
    "sector_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "assigned_by" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "complaint_assignments_pkey" PRIMARY KEY ("id")
);

-- Table: sla_config
CREATE TABLE IF NOT EXISTS "sla_config" (
    "id" TEXT NOT NULL,
    "condominium_id" TEXT,
    "priority" "ComplaintPriority" NOT NULL,
    "response_minutes" INTEGER NOT NULL,
    "resolution_minutes" INTEGER NOT NULL,
    "escalation_buffer_minutes" INTEGER NOT NULL DEFAULT 30,
    "working_hours" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sla_config_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- STEP 2: CREATE INDEXES
-- ============================================================

-- Indexes for sectors
CREATE UNIQUE INDEX IF NOT EXISTS "sectors_condominium_id_name_key" ON "sectors"("condominium_id", "name");
CREATE INDEX IF NOT EXISTS "sectors_condominium_id_idx" ON "sectors"("condominium_id");

-- Indexes for sector_members
CREATE UNIQUE INDEX IF NOT EXISTS "sector_members_sector_id_user_id_key" ON "sector_members"("sector_id", "user_id");
CREATE INDEX IF NOT EXISTS "sector_members_sector_id_idx" ON "sector_members"("sector_id");

-- Indexes for complaints
CREATE INDEX IF NOT EXISTS "complaints_condominium_id_status_idx" ON "complaints"("condominium_id", "status");
CREATE INDEX IF NOT EXISTS "complaints_condominium_id_priority_idx" ON "complaints"("condominium_id", "priority");
CREATE INDEX IF NOT EXISTS "complaints_condominium_id_sector_id_idx" ON "complaints"("condominium_id", "sector_id");
CREATE INDEX IF NOT EXISTS "complaints_assignee_id_idx" ON "complaints"("assignee_id");

-- Indexes for complaint_attachments
CREATE INDEX IF NOT EXISTS "complaint_attachments_complaint_id_idx" ON "complaint_attachments"("complaint_id");

-- Indexes for complaint_status_history
CREATE INDEX IF NOT EXISTS "complaint_status_history_complaint_id_idx" ON "complaint_status_history"("complaint_id");

-- Indexes for complaint_assignments
CREATE INDEX IF NOT EXISTS "complaint_assignments_complaint_id_sector_id_idx" ON "complaint_assignments"("complaint_id", "sector_id");

-- Indexes for sla_config
CREATE UNIQUE INDEX IF NOT EXISTS "sla_config_condominium_id_priority_key" ON "sla_config"("condominium_id", "priority");
CREATE INDEX IF NOT EXISTS "sla_config_priority_idx" ON "sla_config"("priority");

-- ============================================================
-- STEP 3: ADD FOREIGN KEYS
-- ============================================================

DO $$
BEGIN
    -- Foreign keys for sectors
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sectors_condominium_id_fkey') THEN
        ALTER TABLE "sectors" ADD CONSTRAINT "sectors_condominium_id_fkey"
            FOREIGN KEY ("condominium_id") REFERENCES "condominiums"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Foreign keys for sector_members
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sector_members_sector_id_fkey') THEN
        ALTER TABLE "sector_members" ADD CONSTRAINT "sector_members_sector_id_fkey"
            FOREIGN KEY ("sector_id") REFERENCES "sectors"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sector_members_user_id_fkey') THEN
        ALTER TABLE "sector_members" ADD CONSTRAINT "sector_members_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Foreign keys for complaints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'complaints_condominium_id_fkey') THEN
        ALTER TABLE "complaints" ADD CONSTRAINT "complaints_condominium_id_fkey"
            FOREIGN KEY ("condominium_id") REFERENCES "condominiums"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'complaints_resident_id_fkey') THEN
        ALTER TABLE "complaints" ADD CONSTRAINT "complaints_resident_id_fkey"
            FOREIGN KEY ("resident_id") REFERENCES "residents"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'complaints_sector_id_fkey') THEN
        ALTER TABLE "complaints" ADD CONSTRAINT "complaints_sector_id_fkey"
            FOREIGN KEY ("sector_id") REFERENCES "sectors"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'complaints_assignee_id_fkey') THEN
        ALTER TABLE "complaints" ADD CONSTRAINT "complaints_assignee_id_fkey"
            FOREIGN KEY ("assignee_id") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'complaints_resolved_by_fkey') THEN
        ALTER TABLE "complaints" ADD CONSTRAINT "complaints_resolved_by_fkey"
            FOREIGN KEY ("resolved_by") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'complaints_escalation_target_id_fkey') THEN
        ALTER TABLE "complaints" ADD CONSTRAINT "complaints_escalation_target_id_fkey"
            FOREIGN KEY ("escalation_target_id") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- Foreign keys for complaint_attachments
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'complaint_attachments_complaint_id_fkey') THEN
        ALTER TABLE "complaint_attachments" ADD CONSTRAINT "complaint_attachments_complaint_id_fkey"
            FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Foreign keys for complaint_status_history
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'complaint_status_history_complaint_id_fkey') THEN
        ALTER TABLE "complaint_status_history" ADD CONSTRAINT "complaint_status_history_complaint_id_fkey"
            FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Foreign keys for complaint_assignments
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'complaint_assignments_complaint_id_fkey') THEN
        ALTER TABLE "complaint_assignments" ADD CONSTRAINT "complaint_assignments_complaint_id_fkey"
            FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'complaint_assignments_sector_id_fkey') THEN
        ALTER TABLE "complaint_assignments" ADD CONSTRAINT "complaint_assignments_sector_id_fkey"
            FOREIGN KEY ("sector_id") REFERENCES "sectors"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'complaint_assignments_assignee_id_fkey') THEN
        ALTER TABLE "complaint_assignments" ADD CONSTRAINT "complaint_assignments_assignee_id_fkey"
            FOREIGN KEY ("assignee_id") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'complaint_assignments_assigned_by_fkey') THEN
        ALTER TABLE "complaint_assignments" ADD CONSTRAINT "complaint_assignments_assigned_by_fkey"
            FOREIGN KEY ("assigned_by") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- Foreign keys for sla_config
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sla_config_condominium_id_fkey') THEN
        ALTER TABLE "sla_config" ADD CONSTRAINT "sla_config_condominium_id_fkey"
            FOREIGN KEY ("condominium_id") REFERENCES "condominiums"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
