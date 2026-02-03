-- Tabela complaint_status_history foi criada no init sem action e metadata.
-- Esta migração adiciona as colunas para compatibilidade com o schema atual.
ALTER TABLE "complaint_status_history" ADD COLUMN IF NOT EXISTS "action" TEXT NOT NULL DEFAULT 'STATUS_CHANGE';
ALTER TABLE "complaint_status_history" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
