-- AlterTable
ALTER TABLE "condominiums" ADD COLUMN "structure" JSONB;

-- Add comment
COMMENT ON COLUMN "condominiums"."structure" IS 'Estrutura do condomínio (torres, andares, unidades) no formato JSON';

