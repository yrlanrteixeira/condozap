-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "condominium_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcements_condominium_id_idx" ON "announcements"("condominium_id");

-- CreateIndex
CREATE INDEX "announcements_condominium_id_starts_at_ends_at_idx" ON "announcements"("condominium_id", "starts_at", "ends_at");

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_condominium_id_fkey" FOREIGN KEY ("condominium_id") REFERENCES "condominiums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
