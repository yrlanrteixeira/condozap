-- CreateTable
CREATE TABLE "resident_invites" (
    "id" TEXT NOT NULL,
    "condominium_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "tower" TEXT,
    "floor" TEXT,
    "unit" TEXT,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "consumed_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resident_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resident_invites_token_hash_key" ON "resident_invites"("token_hash");

-- CreateIndex
CREATE INDEX "resident_invites_condominium_id_phone_idx" ON "resident_invites"("condominium_id", "phone");

-- AddForeignKey
ALTER TABLE "resident_invites" ADD CONSTRAINT "resident_invites_condominium_id_fkey" FOREIGN KEY ("condominium_id") REFERENCES "condominiums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_invites" ADD CONSTRAINT "resident_invites_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
