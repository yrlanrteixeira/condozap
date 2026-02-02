-- CreateTable
CREATE TABLE "sector_members" (
    "id" TEXT NOT NULL,
    "sector_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "workload" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sector_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sector_members_sector_id_user_id_key" ON "sector_members"("sector_id", "user_id");

-- CreateIndex
CREATE INDEX "sector_members_sector_id_idx" ON "sector_members"("sector_id");

-- AddForeignKey
ALTER TABLE "sector_members" ADD CONSTRAINT "sector_members_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sector_members" ADD CONSTRAINT "sector_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
